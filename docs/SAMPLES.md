# HeartLens AI synthetic lab samples

Four fictional educational PDFs are available in the assessment import UI and `apps/web/public/samples/`. They contain no real patient data, hospital affiliation or embedded model score. Each is credited to Himanshu Chauhan and visibly marked synthetic.

1. Open `/assess` and choose optional lab import.
2. Download and upload one of the sample PDFs.
3. Review all extracted values and complete missing medical-history answers. Submission stays blocked until review is complete.
4. Request a genuine backend prediction and inspect its artifact identity.

| PDF | Fictional profile | Verified model probability |
| --- | --- | --- |
| `heartlens-sample-01.pdf` | Age 42, female, BP 118/76, cholesterol 1, glucose 1 | 10.17% (Low) |
| `heartlens-sample-02.pdf` | Age 58, male, BP 145/90, cholesterol 2, glucose 1 | 84.08% (High) |
| `heartlens-sample-03.pdf` | Age 63, male, BP 156/96, cholesterol 3, glucose 2 | 82.25% (High) |
| `heartlens-sample-04.pdf` | Age 49, female, BP 126/80, cholesterol 1, glucose 2 | 31.55% (Low) |

BP is in mmHg. Categories 1/2/3 mean normal/above normal/well above normal in the source dataset. These are genuine measured outputs of development artifact `b532dbf82fe5`, not illustrative calculations, future-event risks or clinical assessments. Retraining can change results. Profiles differ across multiple inputs and are not a controlled comparison of one factor.

Marked samples parse locally without Groq or external processing. General personal report extraction uses a separate optional provider and requires explicit consent/configuration. Review is always required; sample parsing does not establish clinical report validity.

[Import evidence](sample-import-verification.json) records all eleven extracted fields and genuine predictions for all four actual PDFs. Generation source: `scripts/generate_sample_reports.py`; integration check: `scripts/verify_sample_import.py`. Saved-report output PDFs are separate from these sample input files.
