# HeartLens AI validation record

Updated 19 October 2026. All assessment values and reports used in verification are synthetic. This is local engineering evidence, not clinical validation.

## Genuine model evidence

The original quick pipeline trained Logistic Regression, LightGBM and XGBoost and selected isotonic-calibrated LightGBM. Artifact version: `b532dbf82fe5`; SHA256: `b532dbf82fe525b7093ca68be1f587c15ae735d8724142f811457dbb91ec8ce6`. Generated metadata is in `backend/models/artifacts/training_metadata.json` (included for deployment).

The cleaned dataset has 69,707 rows: 48,794 training and 20,913 held-out. Measured held-out accuracy is 0.74135705, ROC AUC 0.80359082 and Brier score 0.17945700. Training warned about 17 out-of-range BMI values and 10 interaction values and continued under the original policy. Full tuned training was not run. These metrics concern source-dataset disease presence, with no future-event horizon or external clinical validation.

## Automated checks

| Check | Recorded result |
| --- | --- |
| Backend full suite | 117 passed, 1 skipped, 63 warnings |
| Backend focused regressions | 34 passed |
| Latest sample/report regressions | 20 passed, including an additional actual-PDF integration test |
| Frontend suite | 7 files, 93 tests passed |
| Lint and TypeScript | Passed |
| Production/static builds | Final production build passed (all ten application routes); static export also passed with expected middleware-disabled warning |

Separate suite counts are not cumulative. Logs remain in the workspace `work/` directory. Warnings include dependency deprecations.

[Local HTTP evidence](local-integration-evidence.json) records a loaded artifact and genuine prediction; registration/login/current user; server-recomputed save/list/detail; preserved assumptions; UTC timestamps; report PDF text/provenance; ownership 404; public reload/metrics 403; and invalid BP 422. This is separate from mocked frontend contracts.

All four actual sample PDFs passed extraction of the exact eleven expected fields followed by genuine prediction with the same artifact version. See [sample evidence](sample-import-verification.json) and [sample usage](SAMPLES.md).

## Actual browser verification

- Sample 02 upload reached review, blocked submission until missing history was completed, then returned 84.1% from the backend. A systolic-128 scenario returned 46.5% with the same artifact; reset restored 84.1%.
- Registration with automatic login, dashboard, genuine report save, detail with matching version and synthetic-input note, PDF download and logout navigation passed.
- Home and results were checked in both themes at widths 320, 360, 390, 768, 1024, 1440 and 1920. All 28 checks showed no horizontal overflow; see [viewport evidence](browser-responsive-evidence.json). This does not cover every route at every width.
- Mobile menu Escape closed the menu and restored trigger focus. The monitor pause control produced computed paused animation state. Reduced-motion CSS exists; OS preference emulation was not performed.
- Reload preserved age 58, male, BP 145/90, height 175, weight 85, cholesterol category 2, glucose category 1 and negative history answers. Unit round trips preserved canonical values.
- Category-only copy passed. Detailed-share disclosure and initially disabled action were verified. Automatic approval review rejected actual copying of the detailed health-bearing URL; no bypass or successful clipboard claim is made.
- Server PDF output was rendered and text verified. The actual operating-system print dialog was not exercised.

## Verification limits

Development frontend `127.0.0.1:3000` and backend `127.0.0.1:8000` were exercised. Host approval policy repeatedly blocked launching the production runtime, including after a network grant. Builds do not establish production runtime behavior. Production and static client-bundle scans found no private service-key matches; end-to-end production proxy operation with a nondefault key remains unverified.

Docker is unavailable, so Compose runtime is unverified. Lighthouse, Web Vitals, formal WCAG conformance, 200% OS zoom, OS reduced-motion behavior and live external Groq extraction were not measured. Publication was subsequently authorized. GitHub and Vercel publication status is tracked separately. Dataset redistribution licensing remains unresolved in [provenance](PROVENANCE.md).


## Publication update — 19 October 2026

- Removed the visible monitor caption and added an animated Lucide heart in the Himanshu Chauhan footer credit, with reduced-motion CSS. Browser verification found the `love-beat` animation, correct accessible credit, no old caption, and no mobile horizontal overflow.
- Frontend: 99 tests in 8 files passed; lint, TypeScript and the Next.js production build passed.
- Backend: 31 targeted sample-extraction, account/report and model-contract tests passed after the PDF credit and serverless startup changes. These are not additional independent cases to sum with previous full-suite totals.
- Added a server-only Vercel service gateway. Tests cover operational-route denial, missing-database account rejection before credential forwarding, private-key replacement, genuine-response forwarding and unreachable backend behavior.
- Vercel account identity matches `himchp-2600`, but the connector returned 403 for the intended team scope. Remote serverless inference and persistent database behavior remain unverified until deployment succeeds.

## Live repair verification — 19 October 2026

This section supersedes the earlier deployment limitations above. Production is https://heartlens-ai.vercel.app on `drmonsares-projects/heartlens-ai`; deployment `dpl_4mkqcuXwvFx14fFYkaaiVD29HqQ8` is ready. The private FastAPI container installs libgomp1 and PyYAML and loads the bundled artifact during its build. The inference graph now bounds fitted fold and preprocessing workers without changing artifact bytes or predictions. Local requests previously exceeding the frontend timeout now completed in 0.18–0.54 seconds in the observed three-request run.

- Backend full suite: 126 passed, 1 skipped; subsequent portable inference regression suite: 9 passed. Counts overlap and are not additive.
- Frontend: 120 tests in 8 files passed; lint, TypeScript and remote production build passed.
- Production health: healthy, model_loaded=true, version b532dbf82fe5.
- All four real synthetic PDF files passed exact-field extraction and genuine prediction through the live gateway: [live sample evidence](live-sample-import-verification.json).
- Free Neon PostgreSQL was provisioned and connected with authentication enabled, after explicit approval of provisioning and marketplace terms. [Live integration evidence](live-integration-evidence.json) confirms registration, login, current-user lookup, recomputed save, list/detail, PDF content/provenance, UTC timestamps, preserved assumptions, cross-user 404, public operational endpoints 403 and invalid blood pressure 422.
- Only fictional educational profiles and disposable synthetic test accounts were used. No patient records were tested.

General third-party report extraction still needs a private GROQ_API_KEY and has not been verified live. Docker Compose remains unverified locally; the Vercel container was built and run remotely. These checks establish application behavior, not clinical validity or guaranteed uptime. The canonical public GitHub repository is https://github.com/himanshu-chauhan-stack/heartlens-ai; the deployment was uploaded directly with the official CLI rather than relying on the older private import copy.
