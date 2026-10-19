import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createShareableResultsUrl,
  decodeSharedResult,
  encodeSharedResult,
} from "./shareUrl";
import { createEmptyAssessment } from "./risk";

const encoded = (value: unknown) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
const data = {
  ...createEmptyAssessment(),
  age: 58,
  sex: "male" as const,
  heightCm: 175,
  weightKg: 85,
  systolicBp: 145,
  diastolicBp: 90,
  totalCholesterol: 220,
  glucoseCategory: 1 as const,
  smokingStatus: "never" as const,
  smoking: false,
  alcohol: false,
  activityLevel: "moderate" as const,
  diabetes: false,
  onBpMedication: false,
  familyHistoryType: "none" as const,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("untrusted detailed share payloads", () => {
  it.each(["", "%%%", "not-json", "a".repeat(50_000)])(
    "rejects corrupt or oversized encoded input",
    (input) => {
      expect(decodeSharedResult(input)).toBeNull();
    },
  );

  it.each([null, 7, "hello", [], {}, { data: {}, result: {} }])(
    "rejects JSON without a valid assessment schema: %j",
    (input) => {
      expect(decodeSharedResult(encoded(input))).toBeNull();
    },
  );

  it("does not accept a supplied probability as proof of a model result", () => {
    expect(
      decodeSharedResult(
        encoded({
          data: { age: 58 },
          result: { score: 99, source: "model", category: "high" },
        }),
      ),
    ).toBeNull();
  });

  it("round-trips valid health inputs while stripping an embedded score", () => {
    const result = {
      score: 99,
      category: "high" as const,
      summary: "Forged result",
      drivers: [],
      recommendations: [],
    };
    expect(decodeSharedResult(encodeSharedResult({ data, result }))).toEqual({
      data,
    });
    expect(decodeSharedResult(encoded({ data, result }))).toEqual({ data });
  });

  it("preserves deployment basePath and origin for explicitly requested links", () => {
    vi.stubGlobal("window", { location: { origin: "https://example.test" } });
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/heartlens-ai/");
    const url = new URL(createShareableResultsUrl({ data }));
    expect(url.origin).toBe("https://example.test");
    expect(url.pathname).toBe("/heartlens-ai/results");
    expect(decodeSharedResult(url.searchParams.get("data")!)).toEqual({ data });
  });
});
