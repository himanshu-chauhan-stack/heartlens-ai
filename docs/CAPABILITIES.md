# HeartLens AI capabilities

Interface redesign and adaptation: Himanshu Chauhan. Upstream baseline: `1308460473b9f67eeb8fe5513c1540cbad393a8f`. Required source/license notices remain in [provenance](PROVENANCE.md) and `LICENSE`. See [validation](VALIDATION.md) for evidence and limits.

| Capability | Delivered behavior and verification |
| --- | --- |
| Responsive interface | Original green/lime light/dark design; home/results checked at seven widths, 320–1920, without overflow |
| Animated monitor | Decorative heart and sweeping waveform, pause control and reduced-motion CSS; not live ECG or measured vital signs |
| Guest assessment | Manual inputs, canonical units, explicit unknowns/assumptions, reviewed submission; genuine browser journey passed |
| Draft/resume | Session draft; reload retention checked |
| Lab import | Four visibly synthetic PDFs parse locally; review/history completion required; all four actual imports verified |
| General extraction | Optional Groq with configuration and external-processing consent; fallback/validation tested, live provider unexercised |
| Predictions | Genuine eleven-input disease-presence classifier, version/timestamp; failures show errors, never fabricated scores |
| Context/explanations | Diabetes does not replace glucose; HDL/history/medication are contextual. Raw-estimator SHAP is withheld for calibrated probability with a reason |
| Scenarios | Same-backend/artifact calls; actual 84.1% → 46.5% and reset verified; no treatment-effect claim |
| Local history | Device-local records with provenance; legacy scores remain legacy/unknown |
| Sharing | Category-only default; detailed health link requires explicit choice/disclosure. Category copy passed; detailed clipboard action approval-blocked |
| Export | CSV/print paths retained; server PDF rendered/text-verified and browser download completed; OS print dialog untested |
| Accounts/reports | Registration/automatic login, dashboard, save/detail/PDF and logout exercised; server recomputation and ownership verified |
| Cardiologist link | User-requested Google Maps search; no location access or booking implied |
| Information pages | Methodology/privacy distinguish disease presence, context fields, storage and optional extraction |
| API/operations | Predict/batch, health/model info, accounts/reports/extraction retained; invalid BP 422, ownership 404, public reload/metrics 403 verified |
| Training | Original dataset/pipeline; quick calibrated LightGBM trained/evaluated; full tuning and clinical validation not performed |

Regression coverage includes mapping, provenance/response validation, consent, explanation scale, corrupted history/share payloads, error states, cancellation and account/report contracts. This evidence does not establish universal accessibility, production performance or clinical suitability.
