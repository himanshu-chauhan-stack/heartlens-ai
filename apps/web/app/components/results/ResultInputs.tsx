import type { BackendPredictionRequest } from "../../lib/predictApi";
export function ResultInputs({
  request,
  defaultedFields,
  summary,
}: {
  request: BackendPredictionRequest;
  defaultedFields: string[];
  summary?: string;
}) {
  return (
    <div className="card-panel result-section">
      <h2 className="type-h3">Your inputs & assumptions</h2>
      <p className="lead">
        {summary ??
          (defaultedFields.length
            ? `${defaultedFields.length} missing values were filled using assumptions you accepted.`
            : "All eleven model inputs were available; no missing-value assumptions were used.")}
      </p>
      {defaultedFields.length > 0 && (
        <ul className="assumption-list">
          {defaultedFields.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <details className="result-provenance">
        <summary>Review the exact model request ↓</summary>
        <div className="report-inputs">
          {Object.entries(request).map(([k, v]) => (
            <div className="review-row" key={k}>
              <span>
                {
                  (
                    {
                      age: "Age · years",
                      sex: "Sex · 0 female / 1 male",
                      height: "Height · cm",
                      weight: "Weight · kg",
                      ap_hi: "Systolic · mmHg",
                      ap_lo: "Diastolic · mmHg",
                      cholesterol: "Cholesterol · category 1–3",
                      gluc: "Glucose · category 1–3",
                      smoke: "Smoking · 0 no / 1 yes",
                      alco: "Alcohol · 0 no / 1 yes",
                      active: "Activity · 0 inactive / 1 active",
                    } as Record<string, string>
                  )[k]
                }
              </span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <p>
          Cholesterol measurements map at 200/240 mg/dL. Moderate and high
          activity map to active. HDL, diabetes history, family history and BP
          medication are context only. Diabetes is not used as a glucose proxy.
        </p>
      </details>
    </div>
  );
}
