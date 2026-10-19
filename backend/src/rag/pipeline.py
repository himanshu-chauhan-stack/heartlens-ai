"""
RAG Pipeline for Medical Report Extraction
==========================================
Adapted from an earlier prototype of this project (see repo history) for the
current 11-feature cardiovascular lifestyle schema. Torch-free implementation:
  - pdfplumber / python-docx  for document parsing
  - sklearn TF-IDF + cosine   for vector search  (no torch, no DLL issues)
  - Groq Qwen LLM             for structured extraction

Pipeline:
  PDF/DOCX -> Text -> TF-IDF chunks -> Cosine retrieval -> Groq Qwen -> JSON

This never auto-submits extracted values as a prediction: the frontend
pre-fills the assessment wizard with the extracted values and confidence
scores, and the user reviews/edits before submitting.
"""

import io
import logging
import os
import re
import json
import math

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "qwen/qwen3-32b"

_groq_client = None


def _get_groq():
    global _groq_client
    if _groq_client is None:
        if not GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not configured; document extraction is unavailable"
            )
        from groq import Groq

        _groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info("[RAG] Groq client ready.")
    return _groq_client


# ── Document Parsing ──────────────────────────
def _extract_pdf(file_bytes: bytes) -> str:
    import pdfplumber

    try:
        parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return "\n".join(parts)
    except Exception as e:
        # Malformed/corrupted PDF is a bad-input error, not a server error.
        raise ValueError(
            "Could not read this PDF -- it may be corrupted or password-protected"
        ) from e


def _extract_docx(file_bytes: bytes) -> str:
    from docx import Document as DocxDoc

    try:
        doc = DocxDoc(io.BytesIO(file_bytes))
        paras = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        paras.append(cell.text.strip())
        return "\n".join(paras)
    except Exception as e:
        raise ValueError(
            "Could not read this DOCX file -- it may be corrupted"
        ) from e


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext == "pdf":
        return _extract_pdf(file_bytes)
    elif ext == "docx":
        return _extract_docx(file_bytes)
    raise ValueError(f"Unsupported file type: .{ext}. Please upload PDF or DOCX.")


# ── Pure sklearn TF-IDF Retriever ─────────────
class TFIDFRetriever:
    """Torch-free vector retriever using TF-IDF + cosine similarity."""

    def __init__(self, chunks: list):
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        self._chunks = chunks
        self._cos = cosine_similarity
        self._np = np

        self._vectorizer = TfidfVectorizer(
            ngram_range=(1, 2), max_features=8000, sublinear_tf=True
        )
        self._matrix = self._vectorizer.fit_transform(chunks)
        logger.info(
            f"[RAG] TF-IDF index built: {len(chunks)} chunks, vocab={len(self._vectorizer.vocabulary_)}"
        )

    def invoke(self, query: str, k: int = 8) -> list:
        q_vec = self._vectorizer.transform([query])
        scores = self._cos(q_vec, self._matrix)[0]
        top_idx = self._np.argsort(scores)[::-1][:k]

        class _Doc:
            def __init__(self, text):
                self.page_content = text

        return [_Doc(self._chunks[i]) for i in top_idx if scores[i] > 0]


def build_retriever(text: str) -> TFIDFRetriever:
    """Chunk text (paragraph-aware) and build a TF-IDF retriever."""
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) < 600:
            current += (" " if current else "") + para
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)

    if len(text) <= 3000:
        chunks.append(text)

    logger.info(f"[RAG] Created {len(chunks)} chunks.")
    return TFIDFRetriever(chunks)


# ── Retrieval Queries (cardiovascular lifestyle schema) ──
CARDIAC_QUERIES = [
    "patient age years old date of birth",
    "sex gender male female",
    "height cm centimeters stature",
    "weight kg kilograms body mass",
    "blood pressure systolic diastolic mmHg reading",
    "cholesterol total level mg/dL lipid panel",
    "glucose blood sugar level fasting mg/dL",
    "smoking status current smoker tobacco use",
    "alcohol consumption intake drinking",
    "physical activity exercise level active lifestyle",
]


def retrieve_context(retriever: TFIDFRetriever) -> str:
    seen, chunks = set(), []
    for q in CARDIAC_QUERIES:
        for doc in retriever.invoke(q, k=5):
            c = doc.page_content.strip()
            if c not in seen:
                seen.add(c)
                chunks.append(c)
    result = "\n\n---\n\n".join(chunks)
    logger.info(f"[RAG] Retrieved {len(chunks)} unique chunks, {len(result)} chars.")
    return result


# ── LLM Extraction via Groq (Qwen) ───────────
SYSTEM_PROMPT = """You are a medical data extraction specialist. Extract cardiovascular risk factors from the report and return ONLY a valid JSON object.

Required fields:
- age: integer 18-100 (patient age in years)
- sex: 0=Female, 1=Male
- height: integer 120-220 (height in centimeters)
- weight: number 30-250 (weight in kilograms)
- ap_hi: integer 70-240 (systolic blood pressure mmHg)
- ap_lo: integer 40-160 (diastolic blood pressure mmHg)
- cholesterol: 1=Normal, 2=Above normal, 3=Well above normal
- gluc: 1=Normal, 2=Above normal, 3=Well above normal
- smoke: 0=No, 1=Yes (current smoker)
- alco: 0=No, 1=Yes (regular alcohol intake)
- active: 0=No, 1=Yes (physically active)

Also return:
- confidence: {same keys, value 0.0-1.0: 1.0=explicit in report, 0.5=inferred, 0.1=default used}
- patient_name: string or ""
- report_notes: string or ""

Omit missing fields. Never invent defaults or infer measured glucose category from diabetes history.

IMPORTANT: Return ONLY the raw JSON object. No markdown, no code fences, no explanation text."""


def extract_with_llm(context: str) -> dict:
    client = _get_groq()

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Extract cardiovascular risk factors from this medical report:\n\n{context[:7000]}",
            },
        ],
        temperature=0.1,
        max_tokens=2048,
        stream=False,
    )

    raw = completion.choices[0].message.content.strip()
    logger.info("[RAG] Provider response received")

    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```\s*$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        raw = match.group()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning("[RAG] Provider returned malformed JSON")
        raise ValueError("Extraction provider returned invalid JSON") from e


# ── Validation ────────────────────────────────
FIELD_RANGES = {
    "age": (18, 100, int),
    "sex": (0, 1, int),
    "height": (120, 220, int),
    "weight": (30, 250, float),
    "ap_hi": (70, 240, int),
    "ap_lo": (40, 160, int),
    "cholesterol": (1, 3, int),
    "gluc": (1, 3, int),
    "smoke": (0, 1, int),
    "alco": (0, 1, int),
    "active": (0, 1, int),
}


def validate(extracted: dict) -> dict:
    """Leave absent and invalid measurements absent rather than inventing defaults."""
    if not isinstance(extracted, dict):
        raise ValueError("Extraction provider must return a JSON object")
    out = {}
    for field, (lo, hi, cast) in FIELD_RANGES.items():
        try:
            numeric = float(extracted[field])
            if not math.isfinite(numeric) or not lo <= numeric <= hi:
                continue
            if cast is int and not numeric.is_integer():
                continue
            out[field] = cast(numeric)
        except (KeyError, ValueError, TypeError, OverflowError):
            continue
    if "ap_hi" in out and "ap_lo" in out and out["ap_hi"] - out["ap_lo"] < 10:
        out.pop("ap_hi")
        out.pop("ap_lo")
    return out


SAMPLE_MARKER = "HEARTLENS_SYNTHETIC_SAMPLE_V1"
SAMPLE_NOTICE = "SYNTHETIC EDUCATIONAL SAMPLE - NOT A REAL PATIENT"


def extract_synthetic_sample(text: str):
    """Parse the deliberately marked local demonstration format, never a lab heuristic.

    The marker is an explicit sample declaration, not proof of authenticity.
    Any marked upload remains educational synthetic input requiring review.
    """
    lines = [line.strip() for line in text.splitlines()]
    if SAMPLE_MARKER not in lines:
        return None
    if lines.count(SAMPLE_MARKER) != 1 or SAMPLE_NOTICE not in lines:
        raise ValueError(
            "Marked samples require the explicit synthetic educational notice"
        )
    values = {}
    for line in lines:
        match = re.fullmatch(r"([a-z_]+)\s*:\s*(.*?)", line)
        if not match or match.group(1) not in FIELD_RANGES:
            continue
        field, value = match.groups()
        if field in values:
            raise ValueError("Synthetic sample contains duplicate input fields")
        if not re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", value):
            raise ValueError(
                "Synthetic sample fields must contain explicit numeric values"
            )
        values[field] = value
    cleaned = validate(values)
    if set(cleaned) != set(FIELD_RANGES):
        raise ValueError(
            "Synthetic sample requires all 11 valid explicit fields; no defaults are supplied"
        )
    from ..api.schemas import PredictionRequest

    PredictionRequest.model_validate(cleaned)
    return {
        "extracted_values": cleaned,
        "confidence": {field: 1.0 for field in cleaned},
        "patient_name": "Synthetic educational sample",
        "report_notes": "Synthetic HeartLens AI educational sample. Explicit fields parsed locally without an external provider. Not a real patient; review all values before prediction.",
        "sample_source": "heartlens_synthetic_sample_v1",
    }


def process_medical_report(file_bytes: bytes, filename: str) -> dict:
    """
    Full RAG pipeline -- torch-free:
      1. Extract text (pdfplumber / python-docx)
      2. Chunk + TF-IDF index (sklearn, no torch)
      3. Retrieve relevant sections with cardiovascular-focused queries
      4. Groq Qwen LLM structured extraction
      5. Validate explicitly extracted fields; absent values remain absent
    """
    logger.info("[RAG] Processing an uploaded report")

    raw_text = extract_text(file_bytes, filename)
    sample = extract_synthetic_sample(raw_text)
    if sample is not None:
        return sample
    _get_groq()  # Ordinary reports continue to require the configured external provider.
    if len(raw_text.strip()) < 50:
        raise ValueError(
            "Could not extract meaningful text from the document. "
            "Ensure it is not a scanned/image-only PDF."
        )
    logger.info(f"[RAG] Extracted {len(raw_text)} chars.")

    retriever = build_retriever(raw_text)
    context = retrieve_context(retriever)
    llm_result = extract_with_llm(context)
    extracted_values = validate(llm_result)

    raw_confidence = llm_result.get("confidence", {})
    confidence = {}
    for field in extracted_values:
        try:
            value = float(raw_confidence.get(field, 0))
            confidence[field] = (
                max(0.0, min(1.0, value)) if math.isfinite(value) else 0.0
            )
        except (TypeError, ValueError, AttributeError):
            confidence[field] = 0.0
    patient_name = llm_result.get("patient_name", "")
    report_notes = llm_result.get("report_notes", "")

    logger.info("[RAG] Extraction complete; review required")
    return {
        "extracted_values": extracted_values,
        "confidence": confidence,
        "patient_name": patient_name,
        "report_notes": report_notes,
    }
