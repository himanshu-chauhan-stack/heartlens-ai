# Provenance

**Product:** HeartLens AI

**Interface redesign and adaptation by Himanshu Chauhan**

## Upstream

- Source: https://github.com/shlokkvaishnav/cardiovascular-risk
- Baseline commit: `1308460473b9f67eeb8fe5513c1540cbad393a8f`
- Cloned and matched against the build brief on 18 October 2026.
- Original author and copyright: see the preserved `LICENSE`.
- `LICENSE` retains the original copyright and complete MIT permission notice.
- This is an adaptation of that open-source application; the original ML pipeline and optional account/report/extraction capabilities are retained, with documented repairs.

## Dataset and model

Default data: `backend/data/raw/cardio_train.csv`, already committed upstream, 70,000 raw records from the [Kaggle Cardiovascular Disease dataset](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset). The target is observed cardiovascular disease presence. It does not establish a future-event horizon or clinical validation.

SHA256 of the source CSV: `bdeea79d8f231af1df97bddef9564f3d11f86f1932901d04cbedd7d346138c60`.

The Kaggle page was accessed during implementation, but its license text was not readable through the available web response. Dataset redistribution rights remain unverified; MIT covers the application code, not independently the dataset. No extra dataset was downloaded or substituted. Verify the publisher's current license before public redistribution.

The DVC remote is a relative local folder (`../.dvc-remote`), not a guaranteed downloadable artifact store. Artifacts are trained locally with the original pipeline. The known development model and metadata are included for deployment; raw training data and SHAP background records are excluded from the public snapshot. Their exact identity, configuration, dependencies and measured development metrics are recorded in generated `backend/models/artifacts` metadata and validation documentation. Do not substitute an untrusted pickle.

## Adaptation contributions

- Original responsive green/lime visual system, editorial home, accessible mobile navigation and theme controls.
- Disease-presence wording; explicit assumptions and reported glucose category; genuine-only result and same-artifact scenarios.
- Versioned result provenance, legacy history handling, safe sharing and print/export behavior.
- Backend calibrated explanation semantics, extraction privacy and bounded upload handling, protected operations, saved-report provenance.
- Reproducible local setup, tests, CI and deployment configuration repairs and truthful documentation.

The supplied build brief was read in full as the implementation specification; it remains in its user-supplied location. The user subsequently authorized GitHub publication and Vercel hosting. Provider access and deployment evidence are recorded separately.
