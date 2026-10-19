"""
Document upload endpoint: lets a user upload a PDF/DOCX lab report and
pre-fill the assessment wizard via the RAG extraction pipeline, instead of
typing every value manually. Available to guests (no login required) since
it's a convenience for filling out the same form, not a persistence feature.

Extracted values are never used directly as a prediction -- the frontend
shows them for the user to review/edit before submitting to /predict.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile, status, Depends, Header
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/extract", tags=["document-extraction"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


class ExtractionResponse(BaseModel):
    extracted_values: Dict[str, Any]
    confidence: Dict[str, float]
    patient_name: str = ""
    report_notes: str = ""
    sample_source: str | None = None


async def require_service_key(x_api_key: str = Header(default=None)):
    from .app import get_api_key

    return await get_api_key(x_api_key)


@router.post(
    "", response_model=ExtractionResponse, dependencies=[Depends(require_service_key)]
)
async def extract_report(file: UploadFile = File(...)):
    from ..rag.pipeline import process_medical_report

    if file.filename is None or not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=422, detail="Only PDF or DOCX files are supported"
        )

    file_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (10 MB limit)")

    if not file_bytes:
        raise HTTPException(status_code=422, detail="The uploaded file is empty")

    try:
        result = process_medical_report(file_bytes, file.filename)
    except RuntimeError as e:
        # GROQ_API_KEY not configured
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Document extraction failed (%s)", type(e).__name__)
        raise HTTPException(status_code=500, detail="Document extraction failed")

    return ExtractionResponse(**result)
