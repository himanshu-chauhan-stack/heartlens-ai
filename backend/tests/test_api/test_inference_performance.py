"""Online inference must bound every fitted fold without retraining or artifact edits."""

import hashlib
import importlib
import json
import time
from pathlib import Path

import joblib
import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression

from src.api.schemas import PredictionRequest

api = importlib.import_module("src.api.app")


@pytest.mark.parametrize(
    "configured, expected",
    [("1", 1), ("3", 3), ("-1", 1), ("0", 1), ("1000", 8), ("invalid", 1)],
)
def test_inference_threads_are_positive_and_bounded(monkeypatch, configured, expected):
    monkeypatch.setenv("INFERENCE_THREADS", configured)
    assert api._inference_thread_count() == expected


def test_fitted_stacking_members_are_bounded_and_predictions_preserved():
    x = np.arange(40).reshape(20, 2)
    y = np.array([0, 1] * 10)
    fitted = StackingClassifier(
        estimators=[
            (
                "forest",
                RandomForestClassifier(n_estimators=2, n_jobs=1, random_state=42),
            ),
            ("linear", LogisticRegression()),
        ],
        final_estimator=RandomForestClassifier(
            n_estimators=2, n_jobs=1, random_state=42
        ),
        cv=2,
        n_jobs=1,
    ).fit(x, y)
    expected = fitted.predict_proba(x)
    fitted.n_jobs = -1
    fitted.estimators_[0].n_jobs = -1
    fitted.final_estimator_.n_jobs = -1
    api._configure_inference_threads(fitted, threads=1)
    assert (
        fitted.n_jobs
        == fitted.estimators_[0].n_jobs
        == fitted.final_estimator_.n_jobs
        == 1
    )
    np.testing.assert_array_equal(fitted.predict_proba(x), expected)


@pytest.mark.parametrize(
    "reference_mode", ["historical_if_matching", "current_artifact"]
)
def test_real_calibrated_artifact_has_bounded_fast_same_probability(reference_mode):
    assert (
        api.MODEL_PATH.exists()
    ), "Train the documented model before the genuine inference gate"
    before = hashlib.sha256(api.MODEL_PATH.read_bytes()).hexdigest()
    fitted = joblib.load(api.MODEL_PATH)
    fixture = json.loads(
        (
            Path(__file__).parents[1] / "fixtures" / "same_artifact_prediction.json"
        ).read_text()
    )
    features = api._to_feature_vector(PredictionRequest(**fixture["request"]))
    matches_fixture = (
        before == fixture["response"]["artifact_sha256"]
        and reference_mode == "historical_if_matching"
    )
    expected = None
    if not matches_fixture:
        # CI retrains the quick model: compare that artifact against itself,
        # rather than assigning a historical Windows artifact's identity or
        # probability to a new Linux artifact. Threads avoid spawning worker
        # processes merely to obtain the unmodified prediction reference.
        with joblib.parallel_backend("threading"):
            expected = api._model_predict(fitted, features)
    configured = api._configure_inference_threads(fitted, threads=1)
    assert configured > 0
    assert fitted.n_jobs == 1
    assert fitted.calibrated_classifiers_
    for fold in fitted.calibrated_classifiers_:
        # Inspect the fitted fold, not only the calibrator's unfitted template.
        # Candidate classes can change when quick training selects a new winner.
        parameters = fold.estimator.get_params(deep=True)
        parallel_parameters = {
            key: value
            for key, value in parameters.items()
            if key.rsplit("__", 1)[-1] in {"n_jobs", "nthread", "num_threads"}
        }
        assert all(value == 1 for value in parallel_parameters.values())
        for step in getattr(fold.estimator, "named_steps", {}).values():
            if hasattr(step, "transformers_"):
                assert step.n_jobs == 1
                for _, transformer, _ in step.transformers_:
                    if hasattr(transformer, "get_params"):
                        assert all(
                            value == 1
                            for key, value in transformer.get_params(deep=True).items()
                            if key.rsplit("__", 1)[-1]
                            in {"n_jobs", "nthread", "num_threads"}
                        )
    # Include the first prediction, where nested joblib worker startup used to
    # dominate latency. The budget catches the observed ~57s failure while
    # tolerating slower shared CI machines; it is not a clinical performance claim.
    latencies = []
    for _ in range(3):
        start = time.perf_counter()
        result = api._model_predict(fitted, features)
        latencies.append(time.perf_counter() - start)
        if matches_fixture:
            assert float(result[1][0]) == fixture["response"]["probability"]
        else:
            np.testing.assert_array_equal(result[0], expected[0])
            np.testing.assert_allclose(result[1], expected[1], rtol=0, atol=1e-12)
            np.testing.assert_allclose(result[2], expected[2], rtol=0, atol=1e-12)
    assert max(latencies) < 5.0, f"Single-row inference seconds: {latencies}"
    assert hashlib.sha256(api.MODEL_PATH.read_bytes()).hexdigest() == before
