import type { AssessmentData } from "./risk";
import { apiUrl } from "./apiUrl";
export type ExtractionResponse = {
  extracted_values: Partial<{
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
  }>;
  confidence: Record<string, number>;
  sample_source?: string;
  patient_name?: string;
  report_notes?: string;
};
export class ExtractionApiError extends Error {}
export async function extractFromDocument(
  file: File,
): Promise<ExtractionResponse> {
  if (file.size > 10 * 1024 * 1024)
    throw new ExtractionApiError("Document must be smaller than 10 MB.");
  if (!/\.(pdf|docx)$/i.test(file.name))
    throw new ExtractionApiError("Use a PDF or DOCX document.");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(apiUrl("/api/extract"), {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    let detail = `Extraction unavailable (${res.status}). Continue with manual entry.`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {}
    throw new ExtractionApiError(detail);
  }
  const value = await res.json();
  if (!value || typeof value.extracted_values !== "object")
    throw new ExtractionApiError(
      "The extraction response was invalid. Enter your values manually.",
    );
  return value;
}
export function extractionToAssessmentPatch(
  extraction: ExtractionResponse,
): Partial<AssessmentData> {
  const v = extraction.extracted_values;
  const patch: Partial<AssessmentData> = {};
  const numeric = (
    key: keyof typeof v,
    min: number,
    max: number,
    field: keyof AssessmentData,
  ) => {
    const value = v[key];
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max
    )
      Object.assign(patch, { [field]: value });
  };
  numeric("age", 20, 79, "age");
  numeric("height", 120, 220, "heightCm");
  numeric("weight", 30, 250, "weightKg");
  numeric("ap_hi", 80, 240, "systolicBp");
  numeric("ap_lo", 40, 160, "diastolicBp");
  if (v.sex === 0 || v.sex === 1) patch.sex = v.sex === 1 ? "male" : "female";
  if (v.cholesterol && [1, 2, 3].includes(v.cholesterol))
    patch.cholesterolCategory = v.cholesterol as 1 | 2 | 3;
  if (v.gluc && [1, 2, 3].includes(v.gluc))
    patch.glucoseCategory = v.gluc as 1 | 2 | 3;
  if (v.smoke === 0 || v.smoke === 1) {
    patch.smoking = v.smoke === 1;
    patch.smokingStatus = v.smoke === 1 ? "current" : "never";
  }
  if (v.alco === 0 || v.alco === 1) patch.alcohol = v.alco === 1;
  if (v.active === 0 || v.active === 1)
    patch.activityLevel = v.active === 1 ? "moderate" : "low";
  return patch;
}
