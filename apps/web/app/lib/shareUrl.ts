import type { AssessmentData, RiskResult } from "./risk";
import { restoreAssessment } from "./assessmentStorage";
import { validateAssessment } from "./predictApi";
type SharedPayload = { data: AssessmentData; result?: RiskResult };
function toBase64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  return btoa(Array.from(bytes, (x) => String.fromCharCode(x)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return new TextDecoder().decode(
    Uint8Array.from(
      atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4)),
      (c) => c.charCodeAt(0),
    ),
  );
}
export function encodeSharedResult(payload: SharedPayload) {
  return toBase64Url(JSON.stringify({ version: 2, data: payload.data }));
}
export function decodeSharedResult(encoded: string): SharedPayload | null {
  try {
    if (!encoded || encoded.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(encoded))
      return null;
    const p = JSON.parse(fromBase64Url(encoded));
    if (
      !p ||
      typeof p !== "object" ||
      Array.isArray(p) ||
      !p.data ||
      typeof p.data !== "object" ||
      !p.data.unknownVitals ||
      typeof p.data.unknownVitals !== "object"
    )
      return null;
    const data = restoreAssessment(p.data);
    if (!data) return null;
    if (validateAssessment(data).length) return null;
    return { data };
  } catch {
    return null;
  }
}
export function createShareableResultsUrl(payload: SharedPayload) {
  if (typeof window === "undefined") return "";
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const url = new URL(`${window.location.origin}${base}/results`);
  url.searchParams.set("data", encodeSharedResult(payload));
  return url.toString();
}
