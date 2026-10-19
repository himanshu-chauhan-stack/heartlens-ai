"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  RefreshCw,
  FileDown,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { AssessmentData } from "../lib/risk";
import { restoreAssessment } from "../lib/assessmentStorage";
import {
  backendResponseToRiskResult,
  fetchBackendPrediction,
  mapAssessmentToPredictionRequest,
  validateAssessment,
  type BackendPredictionResponse,
} from "../lib/predictApi";
import { createShareableResultsUrl, decodeSharedResult } from "../lib/shareUrl";
import { useAssessmentHistory } from "../hooks/useAssessmentHistory";
import { ResultInputs } from "./results/ResultInputs";
import { DeviceHistory } from "./results/DeviceHistory";
import { RiskSimulator } from "./simulator/RiskSimulator";
import { isLoggedIn } from "../lib/authApi";
import { saveReport } from "../lib/reportsApi";
const STORAGE_KEY = "cardio_assessment_v1";
export function ResultsDashboard() {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [response, setResponse] = useState<BackendPredictionResponse | null>(
    null,
  );
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const { history, clearHistory, addEntry } = useAssessmentHistory();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const shared = new URLSearchParams(location.search).get("data");
        const payload = shared
          ? decodeSharedResult(shared)
          : JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
        if (!payload?.data || !payload.data.unknownVitals) {
          setStatus("empty");
          return;
        }
        const value = restoreAssessment(payload.data);
        if (!value) {
          setStatus("empty");
          return;
        }
        const issues = validateAssessment(value);
        if (issues.length) {
          setError(issues.join(" "));
          setStatus("invalid");
          return;
        }
        setData(value);
        if (shared)
          setMessage(
            "Shared inputs are unverified. The result below is freshly recomputed; embedded scores are never trusted.",
          );
      } catch {
        setStatus("empty");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null;
        setStatus("loading");
        setError("");
        setResponse(null);
        return fetchBackendPrediction(data, { signal: controller.signal });
      })
      .then((payload) => {
        if (controller.signal.aborted || !payload) return;
        const { response: r, defaultedFields } = payload;
        setResponse(r);
        setStatus("ready");
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ data, response: r }),
        );
        addEntry({
          id: `${r.timestamp}-${r.model_version}`,
          timestamp: r.timestamp,
          score: r.probability * 100,
          category:
            r.risk_level === "Low"
              ? "low"
              : r.risk_level === "High"
                ? "high"
                : "moderate",
          age: data.age,
          systolicBp: data.systolicBp,
          totalCholesterol: data.totalCholesterol,
          hdlCholesterol: data.hdlCholesterol,
          smoking: data.smoking,
          activityLevel: data.activityLevel,
          source: "model",
          modelVersion: r.model_version,
          assumptions:
            data.importSource === "synthetic_sample"
              ? [
                  "Input source: synthetic educational sample",
                  ...defaultedFields,
                ]
              : defaultedFields,
        });
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setStatus("error");
        }
      });
    return () => controller.abort();
  }, [data, retry, addEntry]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied. Share only with people you choose.");
    } catch {
      setMessage("Clipboard unavailable. Your browser did not copy the text.");
    }
  };
  const exportCsv = () => {
    const csv = [
      "timestamp,source,model_version,probability_percent,category,assumptions",
      ...history.map((x) =>
        [
          x.timestamp,
          x.source ?? "legacy_unknown",
          x.modelVersion ?? "unknown",
          x.score.toFixed(2),
          x.category,
          JSON.stringify((x.assumptions ?? []).join("; ")),
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "heartlens-ai-device-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (status === "empty" || status === "invalid")
    return (
      <section className="section" id="content">
        <div className="container">
          <div className="card-panel empty-state">
            <ShieldCheck size={32} />
            <h1 className="type-h2">Your profile starts here.</h1>
            <p className="lead">
              {error ||
                "No valid assessment is available in this tab. Complete your profile to request a genuine model result."}
            </p>
            <Link href="/assess" className="btn btn-primary">
              Start assessment <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    );
  if (!response || !data)
    return (
      <section className="section" id="content">
        <div className="container">
          <div className="card-panel empty-state">
            <RefreshCw
              size={28}
              className={status === "loading" ? "spin" : ""}
            />
            <h1 className="type-h2">
              {status === "error"
                ? "Your result is unavailable."
                : "Bringing your profile into focus."}
            </h1>
            <p role="status" className="lead">
              {error ||
                "Requesting a prediction from the trained backend model. No substitute score is shown."}
            </p>
            {status === "error" && (
              <div className="cta-row">
                <button
                  className="btn btn-primary"
                  onClick={() => setRetry((x) => x + 1)}
                >
                  Retry prediction
                </button>
                <Link href="/assess" className="btn btn-subtle">
                  Review inputs
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  const result = backendResponseToRiskResult(response, []);
  const { request, defaultedFields } = mapAssessmentToPredictionRequest(data);
  return (
    <section className="section" id="content">
      <div className="container">
        <div className="results-heading">
          <span className="eyebrow">YOUR PROFILE, IN FOCUS</span>
          <h1 className="type-h1">A number. With perspective.</h1>
          <p className="lead">
            A starting point for understanding, and for your next conversation.
          </p>
          {data.importSource && (
            <p className="source-note">
              {data.importSource === "synthetic_sample"
                ? "Synthetic educational profile · genuine model inference. These are fictional input measurements."
                : "Inputs imported from a report and reviewed before prediction."}
            </p>
          )}
        </div>
        <div className="print-only">
          <h1>HeartLens AI · Cardiovascular profile</h1>
          <p>Made with Love Himanshu Chauhan</p>
        </div>
        <div className="results-layout">
          <div className="card-panel result-summary">
            <div className="eyebrow">GENUINE BACKEND MODEL RESULT</div>
            <h2 style={{ fontSize: 24, marginTop: 24 }}>
              Model-estimated cardiovascular disease likelihood
            </h2>
            <div className="result-number">
              {(response.probability * 100).toFixed(1)}
              <small>%</small>
            </div>
            <span className="chip">{response.risk_level} model category</span>
            <div className="result-meter">
              <span style={{ width: `${response.probability * 100}%` }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#bdcfbb",
              }}
            >
              <span>Low ≤40%</span>
              <span>Medium ≤70%</span>
              <span>High &gt;70%</span>
            </div>
            <p className="lead" style={{ marginTop: 24 }}>
              The model estimates disease presence in its training target. It
              does not diagnose disease or estimate a future heart attack.
            </p>
            <div className="result-meta">
              {new Date(response.timestamp).toLocaleString()}
              <br />
              {response.model_name ?? "Trained classifier"} ·{" "}
              {response.model_version}
            </div>
          </div>
          <div className="card-panel">
            <ShieldCheck size={25} style={{ color: "var(--primary)" }} />
            <h2 className="type-h3" style={{ marginTop: 20 }}>
              Know what is behind it.
            </h2>
            <p className="lead">
              This score reflects patterns learned from the cardiovascular
              disease dataset, using eleven reported or explicitly assumed
              inputs.
            </p>
            <h3 style={{ fontSize: 18, marginTop: 28 }}>Model explanations</h3>
            {result.drivers.length ? (
              <>
                <p className="source-note">
                  Signed contributions ·{" "}
                  {response.explanation?.output_scale ?? "raw model units"}.
                  These are not percentage-point changes.
                </p>
                {result.drivers.map((d, i) => (
                  <div className="driver-row" key={`${d.label}-${i}`}>
                    <span>{d.label}</span>
                    <strong>
                      {d.impact >= 0 ? "+" : ""}
                      {d.impact.toFixed(4)}
                    </strong>
                  </div>
                ))}
              </>
            ) : (
              <p className="lead">
                {response.explanation?.note ??
                  "Individual contributions are unavailable for this served model. No drivers have been inferred from your answers."}
              </p>
            )}
            <details className="result-provenance">
              <summary>Model identity & scope ↓</summary>
              <p>
                Source: {response.source}
                <br />
                Model: {response.model_name}
                <br />
                Version: {response.model_version}
                <br />
                Artifact SHA-256: {response.artifact_sha256 ?? "Unavailable"}
                <br />
                Target: cardiovascular disease presence
                <br />
                Contract: {response.contract_version ?? "unknown"}
              </p>
            </details>
          </div>
        </div>
        <ResultInputs request={request} defaultedFields={defaultedFields} />
        <div className="card-panel result-section scenario-section">
          <div className="dashboard-head">
            <div>
              <span className="eyebrow">
                A DIFFERENT INPUT. THE SAME MODEL.
              </span>
              <h2 className="type-h3" style={{ marginTop: 14 }}>
                Make room for “what if”.
              </h2>
            </div>
            <SlidersHorizontal size={24} />
          </div>
          <p className="lead">
            Explore how the model responds. Changes below do not modify your
            saved baseline.
          </p>
          <RiskSimulator
            baselineData={data}
            baselineResult={result}
            baselineResponse={response}
          />
        </div>
        <div className="card-panel result-section no-print">
          <h2 className="type-h3">Take the context with you.</h2>
          <p className="lead">
            Bring your measurements and any assumptions to a qualified
            clinician. Ask which measurements to confirm and whether a validated
            clinical assessment is appropriate. The optional map search below
            can help you arrange routine follow-up; it is not an emergency
            service.
          </p>
          <div className="result-actions">
            <button className="btn btn-primary" onClick={() => window.print()}>
              <FileDown size={17} /> Print / save PDF
            </button>
            {isLoggedIn() ? (
              <button
                className="btn btn-subtle"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const saved = await saveReport(
                      request,
                      undefined,
                      data.importSource === "synthetic_sample"
                        ? [
                            "Input source: synthetic educational sample",
                            ...defaultedFields,
                          ]
                        : defaultedFields,
                      response.model_version,
                    );
                    setMessage(
                      saved.provenance?.model_version !== response.model_version
                        ? "Saved report was recomputed using a different model. Review the account report before comparing."
                        : "Saved to your account. The server recomputed this report using the same model.",
                    );
                  } catch (e) {
                    setMessage(
                      e instanceof Error ? e.message : "Could not save report.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save to account"}
              </button>
            ) : (
              <Link className="btn btn-subtle" href="/login">
                Sign in to save
              </Link>
            )}
            <button
              className="btn btn-subtle"
              onClick={() =>
                copy(
                  `HeartLens AI: my model category is ${response.risk_level}. Educational disease-presence estimate, not a diagnosis. ${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`,
                )
              }
            >
              Share category only
            </button>
            <button
              className="btn btn-subtle"
              aria-expanded={details}
              onClick={() => setDetails(!details)}
            >
              Detailed link options
            </button>
            <Link className="btn btn-subtle" href="/assess">
              Edit / retake
            </Link>
            <a
              className="btn btn-subtle"
              href="https://www.google.com/maps/search/cardiologist+near+me/"
              target="_blank"
              rel="noreferrer"
            >
              Find a cardiologist ↗
            </a>
          </div>
          {details && (
            <div style={{ marginTop: 24 }}>
              <p className="lead">
                A detailed link contains all your health inputs in the URL.
                Base64 encoding is not encryption. Anyone with the link can read
                them; browser and server histories may retain it. Scores are
                recomputed on opening.
              </p>
              <label className="trust-pill">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                I choose to include my health inputs in this link.
              </label>
              <button
                disabled={!consent}
                className="btn btn-subtle"
                style={{ marginTop: 16 }}
                onClick={() => copy(createShareableResultsUrl({ data }))}
              >
                Create & copy detailed link
              </button>
            </div>
          )}
          <p role="status" className="status-text">
            {message}
          </p>
        </div>
        <DeviceHistory
          history={history}
          exportCsv={exportCsv}
          clearHistory={clearHistory}
        />
      </div>
    </section>
  );
}
