"use client";
import type { AssessmentHistoryEntry } from "../../hooks/useAssessmentHistory";
export function DeviceHistory({
  history,
  exportCsv,
  clearHistory,
}: {
  history: AssessmentHistoryEntry[];
  exportCsv: () => void;
  clearHistory: () => void;
}) {
  return (
    <div className="card-panel result-section no-print">
      <div className="dashboard-head">
        <h2 className="type-h3">On this device.</h2>
        <span className="source-note">
          Persistent browser history · {history.length} records
        </span>
      </div>
      <p className="lead">
        Individual snapshots, each with its own source. Different models and
        legacy calculations are not connected as an improvement trend.
      </p>
      {history.length ? (
        <div className="history-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Estimate</th>
                <th>Source / version</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {history.map((x) => (
                <tr key={x.id}>
                  <td>{new Date(x.timestamp).toLocaleDateString()}</td>
                  <td>{x.score.toFixed(1)}%</td>
                  <td>
                    {x.source === "model"
                      ? `Model · ${x.modelVersion}`
                      : "Legacy · unknown engine"}
                  </td>
                  <td>{x.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="lead">No device history.</p>
      )}
      <div className="result-actions">
        <button className="btn btn-subtle" onClick={exportCsv}>
          Export history CSV
        </button>
        <button
          className="btn btn-subtle"
          onClick={() => {
            if (confirm("Clear persistent assessment history on this device?"))
              clearHistory();
          }}
        >
          Clear device history
        </button>
      </div>
    </div>
  );
}
