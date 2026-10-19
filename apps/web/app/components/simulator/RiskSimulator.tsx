"use client";
import { useEffect, useRef, useState } from "react";
import type { AssessmentData, RiskResult } from "../../lib/risk";
import {
  backendResponseToRiskResult,
  fetchBackendPrediction,
  mapAssessmentToPredictionRequest,
  type BackendPredictionResponse,
} from "../../lib/predictApi";
type Props = {
  baselineData: AssessmentData;
  baselineResult: RiskResult;
  baselineResponse?: BackendPredictionResponse;
  onResultChange?: (result: RiskResult) => void;
};
export function RiskSimulator({
  baselineData,
  baselineResult,
  baselineResponse,
  onResultChange,
}: Props) {
  const [data, setData] = useState(baselineData);
  const [result, setResult] = useState<BackendPredictionResponse | null>(
    baselineResponse ?? null,
  );
  const [status, setStatus] = useState("Baseline restored");
  const seq = useRef(0);
  useEffect(() => {
    const id = ++seq.current;
    const controller = new AbortController();
    if (JSON.stringify(data) === JSON.stringify(baselineData)) {
      return () => controller.abort();
    }
    const timer = setTimeout(() => {
      if (
        data.systolicBp === null ||
        !Number.isFinite(data.systolicBp) ||
        data.systolicBp < 80 ||
        data.systolicBp > 240
      ) {
        setStatus("Enter a systolic value between 80 and 240 mmHg.");
        return;
      }
      setStatus("Requesting the same model…");
      fetchBackendPrediction(data, { signal: controller.signal })
        .then(({ response }) => {
          if (id !== seq.current) return;
          if (
            !baselineResponse?.model_version ||
            response.model_version !== baselineResponse.model_version
          ) {
            setStatus(
              "The model changed. Re-run the baseline before comparing.",
            );
            return;
          }
          setResult(response);
          setStatus("Same-model scenario complete");
          onResultChange?.(backendResponseToRiskResult(response, []));
        })
        .catch((e) => {
          if (!controller.signal.aborted && id === seq.current)
            setStatus(e.message);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [data, baselineData, baselineResponse, onResultChange]);
  const mapped = mapAssessmentToPredictionRequest(baselineData).request;
  const patch = (value: Partial<AssessmentData>) => {
    seq.current++;
    const next = { ...data, ...value };
    const same = JSON.stringify(next) === JSON.stringify(baselineData);
    setResult(same ? (baselineResponse ?? null) : null);
    setStatus(same ? "Baseline restored" : "Waiting for input…");
    setData(next);
  };
  return (
    <div className="scenario-grid">
      <div className="scenario-inputs">
        <label>
          Systolic blood pressure · mmHg
          <input
            type="number"
            min={80}
            max={240}
            value={data.systolicBp ?? ""}
            onChange={(e) =>
              patch({
                systolicBp:
                  e.target.value === "" ? null : Number(e.target.value),
                unknownVitals: { ...data.unknownVitals, systolicBp: false },
              })
            }
          />
        </label>
        <label>
          Reported cholesterol category
          <select
            value={
              data.cholesterolCategory ??
              mapAssessmentToPredictionRequest(data).request.cholesterol
            }
            onChange={(e) =>
              patch({
                cholesterolCategory: Number(e.target.value) as 1 | 2 | 3,
              })
            }
          >
            <option value={1}>Normal (1)</option>
            <option value={2}>Above normal (2)</option>
            <option value={3}>Well above normal (3)</option>
          </select>
        </label>
        <label>
          Current smoking
          <select
            value={data.smokingStatus === "current" ? "yes" : "no"}
            onChange={(e) =>
              patch({
                smokingStatus: e.target.value === "yes" ? "current" : "never",
                smoking: e.target.value === "yes",
              })
            }
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        <label>
          Physical activity
          <select
            value={data.activityLevel ?? "moderate"}
            onChange={(e) =>
              patch({
                activityLevel: e.target
                  .value as AssessmentData["activityLevel"],
              })
            }
          >
            <option value="low">Low (inactive model category)</option>
            <option value="moderate">Moderate (active model category)</option>
            <option value="high">High (active model category)</option>
          </select>
        </label>
        <button
          className="btn btn-subtle"
          onClick={() => {
            seq.current++;
            setData(baselineData);
            setResult(baselineResponse ?? null);
            setStatus("Baseline restored");
          }}
        >
          Reset to exact baseline
        </button>
      </div>
      <div className="scenario-comparison">
        <div className="eyebrow">SAME MODEL · DIFFERENT INPUTS</div>
        <p className="status-text">
          Current: {baselineResult.score.toFixed(1)}%
        </p>
        <div className="scenario-score">
          {result ? `${(result.probability * 100).toFixed(1)}%` : "—"}
        </div>
        <p aria-live="polite" className="status-text">
          {status}
        </p>
        {result && (
          <p>
            {(result.probability * 100 - baselineResult.score).toFixed(1)}{" "}
            percentage points compared with your baseline.
          </p>
        )}
        <p className="lead">
          This is an input sensitivity exercise, not a treatment outcome
          prediction. HDL, family history, diabetes diagnosis and medication are
          not model-supported scenario controls.
        </p>
        <p className="source-note">
          Model version {baselineResponse?.model_version ?? "unavailable"}
        </p>
        <div className="source-note">
          Baseline: {mapped.ap_hi} mmHg systolic · cholesterol{" "}
          {mapped.cholesterol} · smoking {mapped.smoke ? "yes" : "no"} ·
          activity {mapped.active ? "active" : "inactive"}
        </div>
      </div>
    </div>
  );
}
