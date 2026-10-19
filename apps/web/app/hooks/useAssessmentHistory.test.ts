import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendAssessmentHistory,
  HISTORY_KEY,
  type AssessmentHistoryEntry,
} from "./useAssessmentHistory";
function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage, dispatchEvent: vi.fn() });
  return localStorage;
}
const entry = (id: string): AssessmentHistoryEntry => ({
  id,
  timestamp: "2026-10-18T12:00:00Z",
  score: 42,
  category: "moderate",
  age: 58,
  systolicBp: 145,
  totalCholesterol: 220,
  hdlCholesterol: 45,
  smoking: false,
  activityLevel: "moderate",
  source: "model",
  modelVersion: "fixture-v1",
  assumptions: [],
});
afterEach(() => vi.unstubAllGlobals());
describe("device history provenance and migration", () => {
  it("preserves legacy records without inventing their model source", () => {
    const { source, modelVersion, ...legacy } = entry("old");
    void source;
    void modelVersion;
    const store = storage({ cardiorisk_history: JSON.stringify([legacy]) });
    appendAssessmentHistory(entry("new"));
    const saved = JSON.parse(store.getItem(HISTORY_KEY)!);
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({
      source: "model",
      modelVersion: "fixture-v1",
    });
    expect(saved[1].source).toBe("legacy_unknown");
    expect(saved[1].modelVersion).toBeUndefined();
  });
  it("does not trust model labels missing artifact-version provenance", () => {
    const store = storage({
      [HISTORY_KEY]: JSON.stringify([
        { ...entry("old"), modelVersion: undefined },
      ]),
    });
    appendAssessmentHistory(entry("new"));
    expect(JSON.parse(store.getItem(HISTORY_KEY)!)[1].source).toBe(
      "legacy_unknown",
    );
  });
  it("ignores malformed records and tolerates corrupt JSON", () => {
    const store = storage({
      [HISTORY_KEY]: JSON.stringify([
        { ...entry("invalid"), score: 101 },
        { ...entry("bad-date"), timestamp: "bad" },
      ]),
    });
    appendAssessmentHistory(entry("new"));
    expect(JSON.parse(store.getItem(HISTORY_KEY)!)).toHaveLength(1);
    store.setItem(HISTORY_KEY, "broken JSON");
    appendAssessmentHistory(entry("recovered"));
    expect(JSON.parse(store.getItem(HISTORY_KEY)!)[0].id).toBe("recovered");
  });
  it("deduplicates an exact prediction record and caps stored health history", () => {
    const store = storage({
      [HISTORY_KEY]: JSON.stringify(
        Array.from({ length: 24 }, (_, i) => entry(String(i))),
      ),
    });
    appendAssessmentHistory(entry("0"));
    expect(JSON.parse(store.getItem(HISTORY_KEY)!)).toHaveLength(24);
    appendAssessmentHistory(entry("new"));
    const saved = JSON.parse(store.getItem(HISTORY_KEY)!);
    expect(saved).toHaveLength(24);
    expect(saved[0].id).toBe("new");
  });
});
