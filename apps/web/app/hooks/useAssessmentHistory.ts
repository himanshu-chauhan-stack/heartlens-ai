"use client";
import { useCallback, useEffect, useState } from "react";
import type { AssessmentData, RiskCategory } from "../lib/risk";
export const HISTORY_KEY = "heartlens_history_v2";
export type AssessmentHistoryEntry = {
  id: string;
  timestamp: string;
  score: number;
  category: RiskCategory;
  age: number | null;
  systolicBp: number | null;
  totalCholesterol: number | null;
  hdlCholesterol: number | null;
  smoking: boolean | null;
  activityLevel: AssessmentData["activityLevel"];
  source?: "model" | "legacy_unknown";
  modelVersion?: string;
  assumptions?: string[];
};
function parse(raw: string | null): AssessmentHistoryEntry[] {
  try {
    const p = JSON.parse(raw ?? "[]");
    if (!Array.isArray(p)) return [];
    return p
      .filter(
        (x) =>
          x &&
          typeof x.id === "string" &&
          Number.isFinite(Date.parse(x.timestamp)) &&
          typeof x.score === "number" &&
          Number.isFinite(x.score) &&
          x.score >= 0 &&
          x.score <= 100 &&
          ["low", "moderate", "high"].includes(x.category),
      )
      .slice(0, 24)
      .map((x) => ({
        ...x,
        assumptions: Array.isArray(x.assumptions)
          ? x.assumptions
              .filter((a: unknown) => typeof a === "string")
              .slice(0, 30)
          : [],
        source:
          x.source === "model" && typeof x.modelVersion === "string"
            ? "model"
            : "legacy_unknown",
      }));
  } catch {
    return [];
  }
}
function read() {
  const current = localStorage.getItem(HISTORY_KEY);
  if (current) return parse(current);
  const legacy = parse(localStorage.getItem("cardiorisk_history"));
  if (legacy.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(legacy));
  return legacy;
}
export function appendAssessmentHistory(entry: AssessmentHistoryEntry) {
  const next = [entry, ...read().filter((x) => x.id !== entry.id)].slice(0, 24);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("heartlens-history"));
}
export function useAssessmentHistory() {
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  useEffect(() => {
    const sync = () => setHistory(read());
    sync();
    window.addEventListener("heartlens-history", sync);
    return () => window.removeEventListener("heartlens-history", sync);
  }, []);
  const addEntry = useCallback(
    (entry: AssessmentHistoryEntry) => appendAssessmentHistory(entry),
    [],
  );
  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem("cardiorisk_history");
    setHistory([]);
  }, []);
  return { history, historyCount: history.length, addEntry, clearHistory };
}
