"use client";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "../components/SiteShell";
export default function PrivacyPage() {
  const [message, setMessage] = useState("");
  return (
    <main>
      <SiteHeader />
      <section className="section" id="content">
        <div className="container stack">
          <div className="card-panel">
            <span className="eyebrow">YOUR DATA, WITH CONTEXT</span>
            <h1 className="type-h1" style={{ marginTop: 20 }}>
              Know what stays.
              <br />
              Choose what leaves.
            </h1>
            <p className="lead">
              HeartLens AI uses different storage for your current assessment,
              device history and optional account reports. This page describes
              those boundaries.
            </p>
          </div>
          {[
            {
              title: "Current assessment & drafts",
              body: "Answers and the current result use sessionStorage in this browser tab. Drafts let you resume while the tab session remains available. Prediction inputs are sent to the backend for processing.",
            },
            {
              title: "Persistent device history",
              body: "Results, selected measurements, source, model version and assumptions remain in localStorage across visits. Theme preference and optional authentication tokens also use persistent browser storage. Clear device history on Results, or clear local data below.",
            },
            {
              title: "Optional account reports",
              body: "Choosing Save to account sends the model inputs and assumptions to the backend, where the result is recomputed and stored in the configured database for your account. Clearing browser data does not delete those server reports.",
            },
            {
              title: "Optional document extraction",
              body: "Uploading sends a PDF or DOCX to the backend. Explicitly marked HeartLens synthetic samples are parsed locally without an external provider. Other reports use Groq when configured; the inline disclosure and consent control explain this before file selection. Manual entry works without a provider. Review extracted values before use.",
            },
            {
              title: "Sharing & exported reports",
              body: "Category-only sharing is the default. Detailed links include health inputs in the URL. Encoding is not encryption; anyone with the link can read them and browser/server histories may retain them. Detailed links require explicit choice. Printed reports and CSV files are stored wherever you save them.",
            },
          ].map((x) => (
            <div className="card-panel" key={x.title}>
              <h2 className="type-h3">{x.title}</h2>
              <p className="lead">{x.body}</p>
            </div>
          ))}
          <div className="card-panel">
            <h2 className="type-h3">Clear this browser’s HeartLens data.</h2>
            <p className="lead">
              This removes drafts, current assessment, device history and
              sign-in tokens, including compatible legacy keys. Account reports
              stored on the server are unaffected.
            </p>
            <button
              className="btn btn-subtle"
              onClick={() => {
                if (
                  !confirm(
                    "Remove HeartLens assessment data, history and sign-in tokens from this browser?",
                  )
                )
                  return;
                ["cardio_assessment_v1", "cardio_assessment_draft_v1"].forEach(
                  (k) => sessionStorage.removeItem(k),
                );
                [
                  "heartlens_history_v2",
                  "cardiorisk_history",
                  "cardio_auth_token_v1",
                ].forEach((k) => localStorage.removeItem(k));
                window.dispatchEvent(new Event("heartlens-auth"));
                window.dispatchEvent(new Event("heartlens-history"));
                setMessage("HeartLens browser assessment data cleared.");
              }}
            >
              Clear local assessment data
            </button>
            <p role="status" className="status-text">
              {message}
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
