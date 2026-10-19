"""Regressions for truthful output, safe imports and genuine local artifact inference."""

import asyncio
import hashlib
import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.api.schemas import PredictionRequest
from src.rag.pipeline import validate

api = importlib.import_module("src.api.app")
INPUT = dict(
    age=58,
    sex=1,
    height=175,
    weight=85,
    ap_hi=145,
    ap_lo=90,
    cholesterol=2,
    gluc=1,
    smoke=0,
    alco=0,
    active=1,
)


def test_band_boundaries():
    assert [api._risk_level(x) for x in [0, 0.4, 0.400001, 0.7, 0.700001, 1]] == [
        "Low",
        "Low",
        "Medium",
        "Medium",
        "High",
        "High",
    ]


def test_extraction_never_defaults_or_clamps():
    assert validate(
        {"age": 52, "gluc": "unknown", "cholesterol": 4, "weight": float("nan")}
    ) == {"age": 52}
    assert validate({"ap_hi": 100, "ap_lo": 100}) == {}
    assert validate({}) == {}


def test_extraction_non_object_rejected():
    with pytest.raises(ValueError):
        validate([])


def test_calibrated_estimator_is_not_raw_shap():
    class Calibrated:
        calibrated_classifiers_ = [object()]

    assert api._load_explainer(Calibrated()) is None


def test_reload_requires_auth_and_explicit_enable():
    client = TestClient(api.app)
    assert client.post("/model/reload").status_code == 403
    assert (
        client.post("/model/reload", headers={"X-API-Key": "dev-api-key"}).status_code
        == 403
    )


def test_unsupported_doc_and_empty_file():
    client = TestClient(api.app)
    assert (
        client.post(
            "/extract",
            headers={"X-API-Key": "dev-api-key"},
            files={"file": ("a.doc", b"bad")},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/extract",
            headers={"X-API-Key": "dev-api-key"},
            files={"file": ("a.pdf", b"")},
        ).status_code
        == 422
    )


def test_real_artifact_inference_and_contract():
    # Unlike legacy smoke tests, this gate must never accept a degraded 503.
    assert (
        api.MODEL_PATH.exists()
    ), "Train the documented development or full model before this gate"
    asyncio.run(api.load_model())
    client = TestClient(api.app)
    health = client.get("/health").json()
    assert health["model_loaded"] is True
    assert health["timestamp"].endswith("+00:00")
    response = client.post("/predict", json=INPUT, headers={"X-API-Key": "dev-api-key"})
    assert response.status_code == 200, response.text
    result = response.json()
    assert (
        result["artifact_sha256"]
        == hashlib.sha256(api.MODEL_PATH.read_bytes()).hexdigest()
    )
    _, p, _ = api._model_predict(
        api.model, api._to_feature_vector(PredictionRequest(**INPUT))
    )
    assert result["probability"] == pytest.approx(float(p[0]), abs=1e-12)
    assert result["model_version"] == result["artifact_sha256"][:12]
    assert result["timestamp"].endswith("+00:00")
    assert result["top_contributors"] is None
    assert result["baseline_probability"] is None
    assert result["explanation"]["output_scale"] is None


def test_upload_body_is_bounded_before_multipart_parse():
    client = TestClient(api.app)
    response = client.post(
        "/extract",
        content=b"x" * (10 * 1024 * 1024 + 64 * 1024 + 1),
        headers={
            "Content-Type": "multipart/form-data; boundary=bad",
            "X-API-Key": "dev-api-key",
        },
    )
    assert response.status_code == 413


def test_extraction_requires_service_auth():
    response = TestClient(api.app).post(
        "/extract", files={"file": ("a.pdf", b"synthetic")}
    )
    assert response.status_code == 403
