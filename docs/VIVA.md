# HeartLens AI viva guide

## What problem does it address?

It organizes a person's cardiovascular measurements and lifestyle context, sends model inputs to a reproducible classifier, and presents its disease-presence likelihood clearly. It helps demonstrate an end-to-end ML application; it does not diagnose a patient or predict a heart attack in ten years.

## Inputs and output

The model uses age, dataset-encoded sex, height, weight, systolic/diastolic BP, cholesterol/glucose categories, smoking, alcohol and activity. Other collected fields provide context. Unknown measurements are not silently called measured values. Output is the positive-class probability from the trained calibrated artifact, a category, model provenance and timestamp.

## Dataset and preprocessing

The existing Kaggle CSV contains 70,000 raw records with a binary `cardio` disease-presence label. Age is converted from days to years and gender 1/2 to sex 0/1. The loader repairs/clips blood pressure, handles height/weight limits and duplicates, then derives BMI, pulse pressure and other shared features. Training preprocessing is fitted within the original pipeline; inference uses the same derived-feature function. Dataset redistribution licensing needs independent verification.

## Which model is used?

Do not memorize a README claim such as “always LightGBM.” Inspect the delivered `/model/info` and artifact metadata: the pipeline chooses a winner. Quick training compares Logistic Regression, LightGBM and XGBoost without full tuning; the full configuration includes more candidates/search. Isotonic calibration adjusts probability outputs. Quote only the actual run's held-out metrics and identify it as a development model when quick-trained.

## How does the application work?

Next.js renders the form and result UI. Its server proxy forwards requests and injects the service key. FastAPI validates eleven raw features, derives the model columns, runs the saved pipeline and returns a versioned response. React distinguishes loading, model, unavailable and error states. Scenarios request new predictions from the same artifact and do not claim causal treatment effects.

## Why are SHAP explanations sometimes unavailable?

Explaining one raw estimator inside a calibrated ensemble does not automatically explain the served calibrated probability. A log-odds contribution is not a percentage-point change. This implementation reports the explanation limitation instead of inventing a probability baseline or factor contribution.

## What did Himanshu Chauhan contribute?

Interface redesign and adaptation: the original responsive visual system, improved assessment/review/error flows, genuine-only results/scenarios, truthful target/provenance, sharing/privacy/export fixes, backend correctness/security repairs, tests and documentation. The original upstream code/ML architecture is credited to the upstream author under MIT (see LICENSE). Do not claim authorship of the upstream dataset or all original algorithms.

## Reproducible demonstration

1. Train using the README command and start both servers. Confirm `/health` reports a loaded model.
2. Open the home page and show the clearly labeled example, theme controls and phone layout.
3. Start a guest assessment with synthetic values: age 52, female, height 165 cm, weight 70 kg, BP 128/82 mmHg, cholesterol 190 mg/dL, reported normal glucose, no current smoking/alcohol, moderate activity. Complete contextual questions explicitly.
4. Review model inputs and any assumptions, then submit. Show the real response, artifact identity and educational scope.
5. Change a supported scenario field and wait for backend inference; reset to the exact baseline.
6. Export CSV/print and explain local history versus optional account save/PDF.
7. Demonstrate an unavailable API or missing import provider with recovery. No fabricated result should appear.

## Honest limitations

Cross-sectional data supplies no event horizon or evidence of causal benefit. Dataset categories/proxies are coarse; population generalization and calibration need external validation. Historical upstream metrics are not current measurements. Optional Groq extraction is untested without a provider key. Browser/performance/Docker verification status is in `VALIDATION.md`.
