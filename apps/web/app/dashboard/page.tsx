"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader, SiteFooter } from "../components/SiteShell";
import { fetchCurrentUser, isLoggedIn, logout } from "../lib/authApi";
import {
  listReports,
  downloadReportPdf,
  type ReportSummary,
} from "../lib/reportsApi";
export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    Promise.all([fetchCurrentUser(), listReports()])
      .then(([user, rows]) => {
        if (cancelled) return;
        if (!user) {
          router.replace("/login");
          return;
        }
        setEmail(user.email);
        setReports(rows);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not load account reports.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry, router]);
  return (
    <main>
      <SiteHeader />
      <section className="section" id="content">
        <div className="container stack">
          <div className="card-panel">
            <span className="eyebrow">YOUR ACCOUNT</span>
            <div className="dashboard-head" style={{ marginTop: 16 }}>
              <div>
                <h1 className="type-h1">Your saved profiles.</h1>
                <p className="lead">{email || "Optional account reports"}</p>
              </div>
              <button
                className="btn btn-subtle"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Sign out
              </button>
            </div>
            <p className="source-note">
              These reports are stored on the server. Device history on Results
              is stored separately in your browser.
            </p>
          </div>
          {loading ? (
            <div className="card-panel">
              <p role="status" className="lead">
                Loading account reports…
              </p>
            </div>
          ) : error ? (
            <div className="card-panel">
              <p role="alert" className="error-box">
                {error}
              </p>
              <button
                className="btn btn-subtle"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setRetry((x) => x + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="card-panel">
              <div className="dashboard-head">
                <h2 className="type-h3">Report history</h2>
                <Link className="btn btn-primary" href="/assess">
                  New assessment ↗
                </Link>
              </div>
              <p className="lead">
                {reports.length} saved{" "}
                {reports.length === 1 ? "report" : "reports"}. Each snapshot
                retains its model source. Different artifacts are not connected
                as a health-improvement trend.
              </p>
              {reports.length ? (
                <div className="stack">
                  {reports.map((r) => (
                    <article className="review-row" key={r.id}>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <strong>
                        {(r.probability * 100).toFixed(1)}% · {r.risk_level}
                      </strong>
                      <span>
                        {r.provenance?.source === "model"
                          ? `Model ${r.provenance.model_version}`
                          : "Legacy · unknown provenance"}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link
                          className="btn btn-subtle"
                          href={`/dashboard/report?id=${encodeURIComponent(r.id)}`}
                        >
                          View report
                        </Link>
                        <button
                          className="btn btn-subtle"
                          onClick={() =>
                            downloadReportPdf(r.id).catch((e) =>
                              setError(e.message),
                            )
                          }
                        >
                          PDF
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="lead">
                  No account reports yet. Complete a guest assessment, then
                  choose Save to account on Results.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
