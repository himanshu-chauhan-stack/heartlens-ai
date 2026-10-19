import { createEmptyAssessment, type AssessmentData } from "./risk";

/** Recover partial legacy drafts without accepting corrupt types or arbitrary properties. */
export function restoreAssessment(value: unknown): AssessmentData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (
    !raw.unknownVitals ||
    typeof raw.unknownVitals !== "object" ||
    Array.isArray(raw.unknownVitals)
  )
    return null;
  const next = createEmptyAssessment();
  const numeric = [
    "age",
    "heightCm",
    "weightKg",
    "systolicBp",
    "diastolicBp",
    "totalCholesterol",
    "hdlCholesterol",
  ] as const;
  for (const key of numeric) {
    if (
      raw[key] !== undefined &&
      raw[key] !== null &&
      (typeof raw[key] !== "number" || !Number.isFinite(raw[key]))
    )
      return null;
    if (typeof raw[key] === "number") next[key] = raw[key];
  }
  for (const key of [
    "smoking",
    "alcohol",
    "diabetes",
    "familyHistory",
    "onBpMedication",
  ] as const) {
    if (
      raw[key] !== undefined &&
      raw[key] !== null &&
      typeof raw[key] !== "boolean"
    )
      return null;
    if (typeof raw[key] === "boolean") next[key] = raw[key];
  }
  const enums = {
    sex: ["male", "female"],
    smokingStatus: ["never", "former", "current"],
    activityLevel: ["low", "moderate", "high"],
    familyHistoryType: ["none", "male_lt55", "female_lt65", "both"],
  } as const;
  for (const [key, allowed] of Object.entries(enums)) {
    if (
      raw[key] !== undefined &&
      raw[key] !== null &&
      !(allowed as readonly unknown[]).includes(raw[key])
    )
      return null;
    if (typeof raw[key] === "string") Object.assign(next, { [key]: raw[key] });
  }
  for (const key of ["cholesterolCategory", "glucoseCategory"] as const) {
    if (raw[key] != null && ![1, 2, 3].includes(raw[key] as number))
      return null;
    if (raw[key] != null) next[key] = raw[key] as 1 | 2 | 3;
  }
  const flags = raw.unknownVitals as Record<string, unknown>;
  for (const key of Object.keys(
    next.unknownVitals,
  ) as (keyof AssessmentData["unknownVitals"])[]) {
    if (flags[key] !== undefined && typeof flags[key] !== "boolean")
      return null;
    next.unknownVitals[key] = flags[key] === true;
  }
  next.assumptionsAccepted = raw.assumptionsAccepted === true;
  if (
    raw.importSource === "synthetic_sample" ||
    raw.importSource === "external_report"
  )
    next.importSource = raw.importSource;
  if (typeof raw.importNotes === "string")
    next.importNotes = raw.importNotes.slice(0, 2000);
  return next;
}
