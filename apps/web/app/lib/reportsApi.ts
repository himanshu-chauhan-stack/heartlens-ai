import { authFetch, AuthApiError } from "./authApi";
import type { BackendPredictionRequest } from "./predictApi";

export type ReportSummary = {
  id: string;
  risk_level: "Low" | "Medium" | "High";
  probability: number;
  created_at: string;
  note?: string | null;
  provenance?: {
    source?: string;
    model_version?: string;
    model_name?: string;
    artifact_sha256?: string;
    target?: string;
  };
  assumptions?: string[];
  recomputed?: boolean;
};

export type ReportDetail = ReportSummary & {
  inputs: BackendPredictionRequest;
  prediction: number;
  top_contributors?: Array<Record<string, number>> | null;
  baseline_probability?: number | null;
};

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export async function saveReport(
  inputs: BackendPredictionRequest,
  note?: string,
  assumptions?: string[],
  displayed_model_version?: string,
): Promise<ReportDetail> {
  const res = await authFetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs,
      note,
      assumptions,
      displayed_model_version,
    }),
  });
  if (!res.ok) throw new AuthApiError(await parseErrorDetail(res));
  return res.json();
}

export async function listReports(): Promise<ReportSummary[]> {
  const res = await authFetch("/api/reports");
  if (!res.ok) throw new AuthApiError(await parseErrorDetail(res));
  return res.json();
}

export async function getReport(
  id: string,
  signal?: AbortSignal,
): Promise<ReportDetail> {
  const res = await authFetch(`/api/reports/${encodeURIComponent(id)}`, {
    signal,
  });
  if (!res.ok) throw new AuthApiError(await parseErrorDetail(res));
  return res.json();
}

export function reportPdfUrl(id: string): string {
  return `/api/reports/${id}/pdf`;
}

export async function downloadReportPdf(id: string): Promise<void> {
  const res = await authFetch(reportPdfUrl(id));
  if (!res.ok) throw new AuthApiError(await parseErrorDetail(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `heartlens-ai-report-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
