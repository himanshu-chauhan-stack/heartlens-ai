import type { AssessmentData, RiskCategory, RiskResult } from "./risk";
import { apiUrl } from "./apiUrl";
export type BackendPredictionRequest = {
  age: number;
  sex: number;
  height: number;
  weight: number;
  ap_hi: number;
  ap_lo: number;
  cholesterol: number;
  gluc: number;
  smoke: number;
  alco: number;
  active: number;
};
export type BackendPredictionResponse = {
  prediction: number;
  probability: number;
  risk_level: "Low" | "Medium" | "High";
  confidence: number;
  timestamp: string;
  contract_version?: string;
  source?: "model";
  model_version?: string;
  model_name?: string;
  artifact_sha256?: string;
  target?: string;
  request_id?: string | null;
  top_contributors?: Array<Record<string, number>> | null;
  baseline_probability?: number | null;
  explanation?: {
    status: string;
    method: string | null;
    output_scale: string | null;
    calibrated: boolean;
    note: string;
  };
};
export type MappedPrediction = {
  request: BackendPredictionRequest;
  defaultedFields: string[];
};
export class PredictionApiError extends Error {}

// Only recognized service identifiers select copy. Never render arbitrary
// upstream detail: a proxy may return HTML, infrastructure details or secrets.
async function predictionFailureMessage(res: Response): Promise<string> {
  if (res.status !== 503 && res.status !== 502 && res.status !== 504)
    return `Prediction request failed (${res.status}). Your inputs are preserved.`;
  let code: unknown;
  let detail: unknown;
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const error = body as Record<string, unknown>;
      code = error.code;
      detail = error.detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail))
        code ??= (detail as Record<string, unknown>).code;
    }
  } catch {
    // HTML, empty and malformed error responses use recoverable generic copy.
  }
  if (
    code === "model_not_loaded" || code === "model_unavailable" ||
    detail === "Model is not loaded"
  )
    return "The trained model is not loaded yet. Please retry shortly. Your inputs are preserved.";
  if (
    code === "gateway_unconfigured" || code === "service_not_connected" ||
    detail === "The online service is not connected yet"
  )
    return "The prediction service is not connected yet. Please try again once the service connection is restored. Your inputs are preserved.";
  if (
    code === "api_authentication_unconfigured" ||
    detail === "API authentication is not configured"
  )
    return "The prediction service needs a configuration repair. Please try again after the service is restored. Your inputs are preserved.";
  if (code === "backend_timeout" || res.status === 504)
    return "The prediction service took too long to respond. Please retry. Your inputs are preserved.";
  return "The prediction service is temporarily unreachable or busy. Please retry shortly. Your inputs are preserved.";
}
export function validateAssessment(data: AssessmentData): string[] {
  const errors: string[] = [];
  if (
    !data.unknownVitals ||
    Object.values(data.unknownVitals).some((v) => typeof v !== "boolean")
  )
    errors.push("Unknown measurement flags must be boolean values.");
  if (
    data.assumptionsAccepted !== undefined &&
    typeof data.assumptionsAccepted !== "boolean"
  )
    errors.push("Assumptions consent must be a boolean value.");
  const range = (v: number | null | undefined, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (!range(data.age, 20, 79))
    errors.push("Enter age between 20 and 79 in Demographics.");
  if (!["female", "male"].includes(data.sex ?? ""))
    errors.push("Select sex at birth in Demographics.");
  for (const [v, min, max, label] of [
    [data.heightCm, 120, 220, "height (120–220 cm)"],
    [data.weightKg, 30, 250, "weight (30–250 kg)"],
  ] as const) {
    if (v !== null && !range(v, min, max))
      errors.push(`Check ${label} in Vitals.`);
  }
  if (
    !data.unknownVitals?.systolicBp &&
    data.systolicBp !== null &&
    !range(data.systolicBp, 80, 240)
  )
    errors.push("Check systolic blood pressure (80–240 mmHg).");
  if (
    !data.unknownVitals?.diastolicBp &&
    data.diastolicBp !== null &&
    !range(data.diastolicBp, 40, 160)
  )
    errors.push("Check diastolic blood pressure (40–160 mmHg).");
  if (
    data.systolicBp !== null &&
    data.diastolicBp !== null &&
    !data.unknownVitals?.systolicBp &&
    !data.unknownVitals?.diastolicBp &&
    data.systolicBp - data.diastolicBp < 10
  )
    errors.push(
      "Systolic pressure must be at least 10 mmHg above diastolic pressure.",
    );
  if (
    data.totalCholesterol !== null &&
    !data.unknownVitals?.totalCholesterol &&
    !range(data.totalCholesterol, 100, 400)
  )
    errors.push("Check total cholesterol (100–400 mg/dL).");
  if (
    data.hdlCholesterol !== null &&
    !data.unknownVitals?.hdlCholesterol &&
    !range(data.hdlCholesterol, 20, 130)
  )
    errors.push("Check HDL cholesterol (20–130 mg/dL).");
  if (data.glucoseCategory != null && ![1, 2, 3].includes(data.glucoseCategory))
    errors.push("Select a valid reported glucose category.");
  if (
    data.cholesterolCategory != null &&
    ![1, 2, 3].includes(data.cholesterolCategory)
  )
    errors.push("Select a valid cholesterol category.");
  if (!["never", "former", "current"].includes(data.smokingStatus ?? ""))
    errors.push("Select smoking status in Lifestyle.");
  if (!["low", "moderate", "high"].includes(data.activityLevel ?? ""))
    errors.push("Select activity in Lifestyle.");
  if (typeof data.alcohol !== "boolean")
    errors.push("Select alcohol consumption in Lifestyle.");
  if (
    typeof data.diabetes !== "boolean" ||
    typeof data.onBpMedication !== "boolean" ||
    !["none", "male_lt55", "female_lt65", "both"].includes(
      data.familyHistoryType ?? "",
    )
  )
    errors.push("Complete medical history and BP medication in History.");
  return errors;
}
export function mapAssessmentToPredictionRequest(
  data: AssessmentData,
): MappedPrediction {
  const defaultedFields: string[] = [];
  const choose = (
    value: number | null | undefined,
    fallback: number,
    label: string,
  ) => {
    if (value == null) {
      defaultedFields.push(`${label}: assumed ${fallback}`);
      return fallback;
    }
    return value;
  };
  const age = choose(data.age, 50, "Age (years)");
  const sex =
    data.sex === "female"
      ? 0
      : data.sex === "male"
        ? 1
        : choose(null, 1, "Sex (male)");
  const height = choose(data.heightCm, 165, "Height (cm)");
  const weight = choose(data.weightKg, 75, "Weight (kg)");
  const ap_hi = choose(
    data.unknownVitals.systolicBp ? null : data.systolicBp,
    130,
    "Systolic BP (mmHg)",
  );
  const ap_lo = choose(
    data.unknownVitals.diastolicBp ? null : data.diastolicBp,
    Math.round(ap_hi * 0.65),
    "Diastolic BP (mmHg)",
  );
  const cholesterol =
    data.cholesterolCategory ??
    (!data.unknownVitals.totalCholesterol && data.totalCholesterol != null
      ? data.totalCholesterol < 200
        ? 1
        : data.totalCholesterol < 240
          ? 2
          : 3
      : choose(null, 1, "Cholesterol category (normal)"));
  const gluc = choose(
    data.glucoseCategory,
    1,
    "Reported glucose category (normal; not inferred from diabetes)",
  );
  const smoke = data.smokingStatus
    ? Number(data.smokingStatus === "current")
    : data.smoking != null
      ? Number(data.smoking)
      : choose(null, 0, "Current smoking");
  const alco =
    data.alcohol != null ? Number(data.alcohol) : choose(null, 0, "Alcohol");
  const active = data.activityLevel
    ? Number(data.activityLevel !== "low")
    : choose(null, 1, "Activity");
  return {
    request: {
      age,
      sex,
      height,
      weight,
      ap_hi,
      ap_lo,
      cholesterol,
      gluc,
      smoke,
      alco,
      active,
    },
    defaultedFields,
  };
}
const LABELS: Record<string, string> = {
  age: "Age",
  sex: "Sex at birth",
  height: "Height",
  weight: "Weight",
  bmi: "Body mass index",
  ap_hi: "Systolic blood pressure",
  ap_lo: "Diastolic blood pressure",
  cholesterol: "Cholesterol category",
  gluc: "Glucose category",
  smoke: "Current smoking",
  alco: "Alcohol",
  active: "Activity",
};
export function humanizeContributorLabel(key: string) {
  const stripped = key.replace(/^(num__|cat__)/, "");
  return (
    LABELS[stripped] ?? LABELS[stripped.replace(/_[^_]+$/, "")] ?? stripped
  );
}
export function backendResponseToRiskResult(
  response: BackendPredictionResponse,
  recommendations: RiskResult["recommendations"],
): RiskResult {
  const category: RiskCategory =
    response.risk_level === "Low"
      ? "low"
      : response.risk_level === "High"
        ? "high"
        : "moderate";
  return {
    score: response.probability * 100,
    category,
    summary:
      "Model-estimated cardiovascular disease likelihood. This educational estimate describes disease presence in the training target; it is not a diagnosis or a future-event forecast.",
    drivers: (response.top_contributors ?? []).flatMap((entry) =>
      Object.entries(entry).map(([key, impact]) => ({
        label: humanizeContributorLabel(key),
        impact,
      })),
    ),
    recommendations,
  };
}
export function validatePredictionResponse(
  value: unknown,
): value is BackendPredictionResponse {
  if (!value || typeof value !== "object") return false;
  const r = value as BackendPredictionResponse;
  return (
    (r.contract_version === undefined || r.contract_version === "2") &&
    (r.model_name === undefined ||
      (typeof r.model_name === "string" && r.model_name.length <= 160)) &&
    (r.artifact_sha256 === undefined ||
      (typeof r.artifact_sha256 === "string" &&
        /^[a-f0-9]{64}$/.test(r.artifact_sha256))) &&
    [0, 1].includes(r.prediction) &&
    typeof r.confidence === "number" &&
    Number.isFinite(r.confidence) &&
    r.confidence >= 0 &&
    r.confidence <= 1 &&
    (r.top_contributors == null ||
      (Array.isArray(r.top_contributors) &&
        r.top_contributors.every(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            !Array.isArray(entry) &&
            Object.keys(entry).length === 1 &&
            Object.values(entry).every(
              (v) => typeof v === "number" && Number.isFinite(v),
            ),
        ))) &&
    (r.explanation == null ||
      (typeof r.explanation === "object" &&
        typeof r.explanation.status === "string" &&
        typeof r.explanation.note === "string" &&
        typeof r.explanation.calibrated === "boolean")) &&
    typeof r.probability === "number" &&
    Number.isFinite(r.probability) &&
    r.probability >= 0 &&
    r.probability <= 1 &&
    ["Low", "Medium", "High"].includes(r.risk_level) &&
    r.risk_level ===
      (r.probability <= 0.4
        ? "Low"
        : r.probability <= 0.7
          ? "Medium"
          : "High") &&
    typeof r.timestamp === "string" &&
    Number.isFinite(Date.parse(r.timestamp)) &&
    r.source === "model" &&
    typeof r.model_version === "string" &&
    r.model_version.length > 0 &&
    r.model_version.length <= 128 &&
    r.target === "cardiovascular_disease_presence"
  );
}
export async function fetchBackendPrediction(
  data: AssessmentData,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<{ response: BackendPredictionResponse; defaultedFields: string[] }> {
  const errors = validateAssessment(data);
  if (errors.length) throw new PredictionApiError(errors.join(" "));
  const { request, defaultedFields } = mapAssessmentToPredictionRequest(data);
  if (defaultedFields.length && !data.assumptionsAccepted)
    throw new PredictionApiError(
      "Review and explicitly accept the missing-value assumptions before prediction.",
    );
  const controller = new AbortController();
  const abort = () => controller.abort();
  opts.signal?.addEventListener("abort", abort, { once: true });
  if (opts.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, opts.timeoutMs ?? 15000);
  try {
    const res = await fetch(apiUrl("/api/predict"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!res.ok)
      throw new PredictionApiError(await predictionFailureMessage(res));
    const response: unknown = await res.json();
    if (!validatePredictionResponse(response))
      throw new PredictionApiError(
        "The service returned an invalid model response.",
      );
    return { response, defaultedFields };
  } catch (e) {
    if (e instanceof PredictionApiError) throw e;
    throw new PredictionApiError(
      e instanceof Error && e.name === "AbortError"
        ? "Prediction cancelled or timed out. Please retry."
        : "Could not reach the prediction service. Please retry.",
    );
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", abort);
  }
}
