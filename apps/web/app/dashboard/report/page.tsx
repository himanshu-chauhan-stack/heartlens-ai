"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "../../components/SiteShell";
import { ResultInputs } from "../../components/results/ResultInputs";
import { isLoggedIn } from "../../lib/authApi";
import {
  getReport,
  downloadReportPdf,
  type ReportDetail,
} from "../../lib/reportsApi";

function SavedReport() {
  const id = useSearchParams()?.get("id") ?? null;
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    if (!id) return;
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null;
        setReport(null);
        setError("");
        return getReport(id, controller.signal);
      })
      .then((value) => {
        if (value && !controller.signal.aborted) setReport(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "The saved report could not be loaded.",
          );
      });
    return () => controller.abort();
  }, [id, retry, router]);
  return (
    <main>
      <SiteHeader />
      <section className="section" id="content">
        <div className="container stack">
          <Link
            className="btn btn-subtle"
            style={{ width: "fit-content" }}
            href="/dashboard"
          >
            <ArrowLeft size={16} />
            Back to your reports
          </Link>
          {!id || error ? (
            <div className="card-panel empty-state">
              <h1 className="type-h2">Your report is unavailable.</h1>
              <p role="alert" className="lead">
                {!id ? "Choose a report from your account dashboard." : error}
              </p>
              {id && (
                <button
                  className="btn btn-subtle"
                  onClick={() => setRetry((x) => x + 1)}
                >
                  Retry
                </button>
              )}
            </div>
          ) : !report ? (
            <div className="card-panel">
              <p role="status" className="lead">
                Loading your saved model report…
              </p>
            </div>
          ) : (
            <>
              <div className="card-panel">
                <div className="dashboard-head">
                  <div>
                    <span className="eyebrow">SAVED WITH CONTEXT</span>
                    <h1 className="type-h2" style={{ marginTop: 16 }}>
                      HeartLens AI · saved profile
                    </h1>
                    <p className="lead">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={downloading}
                    onClick={async () => {
                      setDownloading(true);
                      try {
                        await downloadReportPdf(report.id);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "PDF download failed.",
                        );
                      } finally {
                        setDownloading(false);
                      }
                    }}
                  >
                    <FileDown size={16} />
                    {downloading ? "Preparing PDF…" : "Download PDF"}
                  </button>
                </div>
                <div className="result-number" style={{ fontSize: 72 }}>
                  {(report.probability * 100).toFixed(1)}
                  <small>%</small>
                </div>
                <span className="chip">{report.risk_level} model category</span>
                <p className="lead" style={{ marginTop: 20 }}>
                  Model-estimated cardiovascular disease likelihood. Educational
                  disease-presence estimate, not a diagnosis or a future-event
                  forecast.
                </p>
                <p className="source-note">
                  Source: {report.provenance?.source ?? "legacy_unknown"} ·
                  Model: {report.provenance?.model_name ?? "unknown"} · Version:{" "}
                  {report.provenance?.model_version ?? "unknown"}
                </p>
                <details className="result-provenance">
                  <summary>Report provenance ↓</summary>
                  <p>
                    Artifact SHA-256:{" "}
                    {report.provenance?.artifact_sha256 ??
                      "Not recorded for this legacy report"}
                    <br />
                    Target:{" "}
                    {report.provenance?.target ?? "Unknown legacy target"}
                    <br />
                    Account reports are recomputed on the server when saved.
                    Legacy records retain unknown provenance.
                  </p>
                </details>
                {report.assumptions?.length ? (
                  <ul className="assumption-list">
                    {report.assumptions.map((x, i) => (
                      <li key={`${i}-${x}`}>{x}</li>
                    ))}
                  </ul>
                ) : null}
                {report.note && <p className="lead">{report.note}</p>}
              </div>
              <ResultInputs
                request={report.inputs}
                defaultedFields={[]}
                summary="These are the exact inputs stored with this report. Any assumptions and input-source notes are listed above."
              />
              <div className="card-panel">
                <ShieldCheck size={24} />
                <h2 className="type-h3" style={{ marginTop: 20 }}>
                  An honest explanation.
                </h2>
                <p className="lead">
                  Individual calibrated-probability contributions were not
                  recorded for this report. A raw estimator contribution is not
                  a percentage-point change in this probability.
                </p>
                <p className="source-note">
                  Made with Love Himanshu Chauhan
                </p>
              </div>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="container section">
          Loading saved profile…
        </p>
      }
    >
      <SavedReport />
    </Suspense>
  );
}
