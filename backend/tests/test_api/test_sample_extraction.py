"""Explicit local sample format never defaults or impersonates real report extraction."""

from unittest.mock import patch
from datetime import datetime, timezone

import pytest

from src.rag.pipeline import (
    extract_synthetic_sample,
    process_medical_report,
    SAMPLE_MARKER,
    SAMPLE_NOTICE,
)
from src.api.reports import ReportSummary

FIELDS = dict(
    age=52,
    sex=0,
    height=165,
    weight=70,
    ap_hi=128,
    ap_lo=82,
    cholesterol=1,
    gluc=1,
    smoke=0,
    alco=0,
    active=1,
)


def sample_text(values=None):
    values = FIELDS if values is None else values
    return "\n".join(
        [SAMPLE_MARKER, SAMPLE_NOTICE, *(f"{k}: {v}" for k, v in values.items())]
    )


def test_explicit_sample_parsed_without_provider_and_never_autopredicts():
    with patch("src.rag.pipeline.extract_text", return_value=sample_text()), patch(
        "src.rag.pipeline._get_groq"
    ) as provider:
        result = process_medical_report(b"synthetic fixture bytes", "sample.pdf")
    provider.assert_not_called()
    assert result["extracted_values"] == FIELDS
    assert result["sample_source"] == "heartlens_synthetic_sample_v1"
    assert "Synthetic" in result["report_notes"]
    assert "probability" not in result


def test_unmarked_report_cannot_use_local_sample_parser():
    assert (
        extract_synthetic_sample(
            sample_text().replace(SAMPLE_MARKER, "Ordinary report")
        )
        is None
    )
    with patch(
        "src.rag.pipeline.extract_text",
        return_value=sample_text().replace(SAMPLE_MARKER, "Ordinary report"),
    ), patch(
        "src.rag.pipeline._get_groq", side_effect=RuntimeError("provider unavailable")
    ):
        with pytest.raises(RuntimeError, match="provider unavailable"):
            process_medical_report(b"ordinary fixture", "ordinary.pdf")


@pytest.mark.parametrize(
    "text",
    [
        sample_text().replace(SAMPLE_NOTICE, ""),
        sample_text({k: v for k, v in FIELDS.items() if k != "gluc"}),
        sample_text({**FIELDS, "gluc": 9}),
        sample_text({**FIELDS, "weight": "unknown"}),
        sample_text({**FIELDS, "ap_hi": 85, "ap_lo": 82}),
        sample_text() + "\nage: 53",
        sample_text() + "\n" + SAMPLE_MARKER,
    ],
)
def test_invalid_sample_rejected_without_defaults(text):
    with pytest.raises(ValueError):
        extract_synthetic_sample(text)


def test_naive_legacy_report_date_is_serialized_as_utc():
    result = ReportSummary(
        id="synthetic",
        risk_level="Low",
        probability=0.2,
        created_at=datetime(2026, 10, 18, 16, 0),
    )
    assert result.created_at.tzinfo == timezone.utc
    assert result.model_dump(mode="json")["created_at"].endswith("Z")


def test_real_pdf_sample_upload_extracts_exact_fields_without_provider():
    from io import BytesIO
    from reportlab.pdfgen import canvas
    from fastapi.testclient import TestClient
    from src.api.app import app

    buffer = BytesIO()
    page = canvas.Canvas(buffer)
    y = 800
    for line in sample_text().splitlines():
        page.drawString(36, y, line)
        y -= 18
    page.save()
    with patch("src.rag.pipeline._get_groq") as provider:
        response = TestClient(app).post(
            "/extract",
            files={"file": ("marked-sample.pdf", buffer.getvalue(), "application/pdf")},
            headers={"X-API-Key": "dev-api-key"},
        )
    assert response.status_code == 200, response.text
    provider.assert_not_called()
    assert response.json()["extracted_values"] == FIELDS
    assert response.json()["sample_source"] == "heartlens_synthetic_sample_v1"
