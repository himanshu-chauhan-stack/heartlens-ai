# HeartLens AI model card

Interface redesign and adaptation by Himanshu Chauhan. Upstream machine-learning pipeline retained under MIT with required original attribution; see the repository LICENSE.

## Scope

The target is **cardiovascular disease presence** (`cardio`), not a ten-year event or future heart attack. The probability is the positive class probability from the loaded calibrated classifier. Bands are Low <= 0.4, Medium > 0.4 through 0.7, and High > 0.7. These are interface bands, not clinical treatment thresholds. `confidence` is only the maximum predicted class probability, not independently validated certainty.

The original Kaggle cardiovascular dataset is committed upstream in `data/raw/cardio_train.csv`. Code licensing does not establish data licensing. Verify dataset redistribution rights independently before publishing data or trained artifacts. This local adaptation does not make a new licensing claim.

## Inputs and preparation

Eleven required raw inputs: age (years); sex (0 female, 1 male); height (cm); weight (kg); systolic and diastolic pressure (mmHg); cholesterol and **reported glucose** categories (1 normal, 2 above normal, 3 well above normal); current smoking, alcohol and physical activity (0/1). API validation requires at least 10 mmHg between systolic and diastolic pressure. Diabetes history is context and is not a measured glucose category. HDL, family history and medication history are contextual fields rather than extra estimator inputs.

Training converts raw age days to years using 365.25 and gender 1/2 to API sex 0/1, repairs/clips pressure, drops inconsistent residual rows, clips height/weight, derives shared features, and drops duplicate rows. Train/test split is stratified with seed 42; imputation, scaling and categorical encoding are inside each fitted pipeline. The shared `src/features/derived.py` derives BMI, pulse pressure, pressure/BMI/age categories, risk score and interaction consistently for training and serving. The model sees 18 named columns. The dataset is observational and has limited geographic/age representation; a plausible accepted input does not establish population validity.

## Training and artifact provenance

Use `python scripts/train.py --config config/config.quick.yaml` from `backend/` for the development configuration. It uses all cleaned dataset rows, five-fold candidate CV for LogisticRegression/LightGBM/XGBoost, no tuning, and three-fold isotonic calibration of the winner. This is explicitly a **development quick model**, distinct from full screening/tuning/stacking configuration. Full training remains available with `config/config.yaml`; stacking comparisons use a single validation split, unlike candidate k-fold CV.

`models/artifacts/training_metadata.json` is the artifact-linked source of truth: selected candidate, measured held-out metrics, dataset/config/artifact SHA256, source commit, source runtime/dependencies, seed/config, cleaned dataset size and split sizes. `/model/info` exposes it; `/predict` carries contract version 2, source, target, selected estimator, full artifact hash and a hash-derived model version. No historical upstream accuracy is reused as a measured result for this adaptation.

## Explanation correctness

The existing explanation utilities remain available for research. Serving deliberately omits raw SHAP for the isotonic-calibrated classifier: unwrapping the first fitted estimator explains a different function on an unverified output scale. Raw log-odds values are not percentage-point changes; an expected raw margin is not a probability. `top_contributors` and `baseline_probability` are null, and `explanation.status` is `unavailable` with a reason. The app does not invent drivers. A future calibrated explanation requires complete-output-scale and full-feature additivity tests before presentation.

## Storage and security

Guest predictions are not inserted into the reports database. Optional authenticated saves recompute on the server, store exact artifact provenance and accepted assumptions within the report inputs JSON under `_heartlens`, and expose clean inputs plus provenance in responses and PDFs. This uses the existing JSON column and does not require a schema migration. Earlier records remain explicitly `legacy_unknown`. Saved model versions can differ from a previously displayed version; save returns the server's current artifact. Reports are owner-scoped. PDF notes are escaped before rendering.

Reload requires the service API key and `ALLOW_MODEL_RELOAD=true`; it is disabled by default. CORS defaults to explicit local frontend origins, and forwarded client headers are ignored unless trusted proxy handling is explicitly enabled. A unique JWT secret of at least 32 characters is required outside development/test. Extraction accepts PDF/DOCX up to 10 MB, bounds the read, omits absent/invalid values, and removes patient-bearing logs. The optional provider receives report context only after frontend disclosure; absent provider returns an explicit unavailable state.

## Validation

`tests/test_api/test_heartlens_contract.py` includes a real-artifact gate that requires model loading and HTTP 200, compares API output with direct same-artifact inference, verifies hash-derived version and explanation absence, and checks category boundaries, extraction validation, upload rejection and protected reload. The whole backend suite should be run after training. See project validation documentation for actual commands/results and any unrun checks.

## Measured local development artifact (18 October 2026)

Selected LightGBM with isotonic calibration; seed 42; cleaned dataset 69707 rows; train 48794, held-out test 20913. Candidate CV and held-out results are distinct. This is the quick development configuration, not a completed full search.

| Held-out metric | Measured value |
|---|---:|
| accuracy | 0.74135705 |
| precision | 0.76144503 |
| recall | 0.70218265 |
| f1_score | 0.73061407 |
| roc_auc | 0.80359082 |
| brier_score | 0.17945700 |

Artifact SHA256: `b532dbf82fe525b7093ca68be1f587c15ae735d8724142f811457dbb91ec8ce6`. Dataset SHA256: `bdeea79d8f231af1df97bddef9564f3d11f86f1932901d04cbedd7d346138c60`. Config SHA256: `7049f41a5a259cbaa982589375a2f7693ca7aa4fd1f9ac7eb383dc6f2b7bf1f6`. Python 3.12.14. Exact local dependencies are in `requirements.lock.txt`; metadata records core model dependencies.

The inherited non-strict validator reported 17 BMI and 10 BMI-interaction values outside its advisory ranges after existing cleaning. Those rows were retained by the documented upstream quick pipeline. No clinical validation or full tuned-search claim is made.

## Explicit educational sample imports

Uploads containing the exact `HEARTLENS_SYNTHETIC_SAMPLE_V1` marker and `SYNTHETIC EDUCATIONAL SAMPLE - NOT A REAL PATIENT` notice can use the local deterministic sample parser. All eleven `field: number` lines must be present, unique, and valid. Missing or invalid sample values are rejected rather than inferred or defaulted. This format is an explicit sample declaration, not a statement of authenticity. The response identifies `sample_source=heartlens_synthetic_sample_v1`, labels the sample educational, and still requires review before a genuine model prediction. It does not contain a prewritten prediction. Ordinary reports continue through the configured external Groq provider; this local parser is not a generic medical-report extraction fallback.

API prediction/health timestamps include an explicit UTC offset. Naive timestamps read from legacy SQLite report rows are interpreted as UTC during response serialization.
