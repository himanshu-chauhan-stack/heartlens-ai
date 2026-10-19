import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyAssessment, type AssessmentData } from "./risk";
import {
  backendResponseToRiskResult,
  fetchBackendPrediction,
  humanizeContributorLabel,
  mapAssessmentToPredictionRequest,
  PredictionApiError,
  validateAssessment,
  validatePredictionResponse,
  type BackendPredictionResponse,
} from "./predictApi";

function full(overrides: Partial<AssessmentData> = {}): AssessmentData {
  return {
    ...createEmptyAssessment(),
    age: 58,
    sex: "male",
    heightCm: 175,
    weightKg: 85,
    systolicBp: 145,
    diastolicBp: 90,
    totalCholesterol: 220,
    hdlCholesterol: 45,
    glucoseCategory: 1,
    smoking: false,
    smokingStatus: "never",
    alcohol: false,
    activityLevel: "moderate",
    diabetes: false,
    familyHistory: false,
    familyHistoryType: "none",
    onBpMedication: false,
    ...overrides,
  };
}
const response: BackendPredictionResponse = {
  prediction: 1,
  probability: 0.72,
  risk_level: "High",
  confidence: 0.72,
  timestamp: "2026-10-18T12:00:00Z",
  source: "model",
  model_version: "synthetic-fixture-v1",
  target: "cardiovascular_disease_presence",
  top_contributors: [{ num__ap_hi: 0.3 }, { num__age: -0.1 }],
  baseline_probability: null,
};
afterEach(() => vi.unstubAllGlobals());

describe("eleven-field model mapping", () => {
  it("preserves canonical years, sex encoding, cm/kg and mmHg", () => {
    const mapped = mapAssessmentToPredictionRequest(full());
    expect(mapped.request).toEqual({
      age: 58,
      sex: 1,
      height: 175,
      weight: 85,
      ap_hi: 145,
      ap_lo: 90,
      cholesterol: 2,
      gluc: 1,
      smoke: 0,
      alco: 0,
      active: 1,
    });
    expect(mapped.defaultedFields).toEqual([]);
    expect(
      mapAssessmentToPredictionRequest(full({ sex: "female" })).request.sex,
    ).toBe(0);
  });
  it.each([
    [199.9, 1],
    [200, 2],
    [239.9, 2],
    [240, 3],
  ])("maps cholesterol %s at the category boundary", (value, expected) => {
    expect(
      mapAssessmentToPredictionRequest(full({ totalCholesterol: value }))
        .request.cholesterol,
    ).toBe(expected);
  });
  it("uses explicit reported glucose independently of diabetes history", () => {
    expect(
      mapAssessmentToPredictionRequest(
        full({ diabetes: true, glucoseCategory: 1 }),
      ).request.gluc,
    ).toBe(1);
    expect(
      mapAssessmentToPredictionRequest(
        full({ diabetes: false, glucoseCategory: 3 }),
      ).request.gluc,
    ).toBe(3);
  });
  it("retains extracted categories without manufacturing lab concentrations", () => {
    expect(
      mapAssessmentToPredictionRequest(
        full({ cholesterolCategory: 3, totalCholesterol: null }),
      ).request.cholesterol,
    ).toBe(3);
  });
  it("respects unknown flags and discloses every substituted feature", () => {
    const data = full({
      heightCm: null,
      weightKg: null,
      glucoseCategory: null,
      unknownVitals: {
        systolicBp: true,
        diastolicBp: true,
        totalCholesterol: true,
        hdlCholesterol: true,
      },
    });
    const mapped = mapAssessmentToPredictionRequest(data);
    expect(mapped.request).toMatchObject({
      height: 165,
      weight: 75,
      ap_hi: 130,
      ap_lo: 85,
      cholesterol: 1,
      gluc: 1,
    });
    expect(mapped.defaultedFields).toHaveLength(6);
    expect(mapped.defaultedFields.join(" ")).toContain(
      "not inferred from diabetes",
    );
  });
  it("keeps former smoking separate from current model smoking", () => {
    expect(
      mapAssessmentToPredictionRequest(
        full({ smokingStatus: "former", smoking: false, activityLevel: "low" }),
      ).request,
    ).toMatchObject({ smoke: 0, active: 0 });
  });
});

describe("whole-assessment validation", () => {
  it("blocks incomplete import/review and accepts a complete form", () => {
    expect(validateAssessment(createEmptyAssessment()).length).toBeGreaterThan(
      0,
    );
    expect(validateAssessment(full())).toEqual([]);
  });
  it.each([
    { age: NaN },
    { age: 36525 },
    { heightCm: 0 },
    { weightKg: Infinity },
    { systolicBp: 95, diastolicBp: 90 },
    { totalCholesterol: 900 },
  ])("rejects invalid measurements %j", (patch) => {
    expect(validateAssessment(full(patch)).length).toBeGreaterThan(0);
  });
  it("requires all contextual history including BP medication", () => {
    expect(
      validateAssessment(full({ onBpMedication: null })).join(" "),
    ).toContain("BP medication");
  });
});

describe("model response provenance, bands and explanation", () => {
  it.each([
    [0, "Low"],
    [0.4, "Low"],
    [0.400001, "Medium"],
    [0.7, "Medium"],
    [0.700001, "High"],
    [1, "High"],
  ])("validates probability %s in band %s", (probability, risk_level) => {
    expect(
      validatePredictionResponse({ ...response, probability, risk_level }),
    ).toBe(true);
  });
  it.each([NaN, Infinity, -0.1, 1.1, ".5", null])(
    "rejects invalid probability %s",
    (probability) => {
      expect(validatePredictionResponse({ ...response, probability })).toBe(
        false,
      );
    },
  );
  it.each([
    { source: "heuristic" },
    { model_version: "" },
    { target: "ten_year_heart_attack" },
    { timestamp: "invalid" },
    { risk_level: "Low" },
  ])("rejects unverified/inconsistent metadata %j", (patch) => {
    expect(validatePredictionResponse({ ...response, ...patch })).toBe(false);
  });
  it.each([
    { model_name: {} },
    { model_version: 42 },
    { model_version: "x".repeat(10000) },
    { artifact_sha256: {} },
    { contract_version: "unexpected-v99" },
    { top_contributors: [{ age: "invalid" }] },
    { top_contributors: [{ age: Infinity }] },
    { confidence: NaN },
    { prediction: "yes" },
  ])("rejects malformed render-sensitive metadata %j", (patch) => {
    expect(validatePredictionResponse({ ...response, ...patch })).toBe(false);
  });
  it("retains signed factors without inventing a calibrated baseline", () => {
    const result = backendResponseToRiskResult(response, []);
    expect(result.score).toBe(72);
    expect(result.drivers).toEqual([
      { label: "Systolic blood pressure", impact: 0.3 },
      { label: "Age", impact: -0.1 },
    ]);
    expect(
      backendResponseToRiskResult({ ...response, top_contributors: null }, [])
        .drivers,
    ).toEqual([]);
    expect(humanizeContributorLabel("cat__cholesterol_2.0")).toBe(
      "Cholesterol category",
    );
    expect(humanizeContributorLabel("unknown_feature")).toBe("unknown_feature");
  });
});

describe("prediction request failures and consent", () => {
  it("requires explicit missing-value assumption acceptance before networking", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      fetchBackendPrediction(full({ glucoseCategory: null })),
    ).rejects.toThrow(/accept/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("sends accepted assumptions and genuine request through same-origin proxy", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => response });
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await fetchBackendPrediction(
          full({ glucoseCategory: null, assumptionsAccepted: true }),
        )
      ).response,
    ).toEqual(response);
    expect(fetch).toHaveBeenCalledWith(
      "/api/predict",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  it.each([401, 422, 429, 503])(
    "rejects service HTTP %s without synthesizing a result",
    async (status) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
      await expect(fetchBackendPrediction(full())).rejects.toThrow(
        PredictionApiError,
      );
    },
  );
  it.each([
    [{ detail: "Model is not loaded" }, /trained model is not loaded/],
    [{ code: "model_not_loaded" }, /trained model is not loaded/],
    [{ detail: { code: "model_unavailable" } }, /trained model is not loaded/],
    [{ detail: "The online service is not connected yet" }, /service is not connected/],
    [{ code: "gateway_unconfigured" }, /service is not connected/],
    [{ detail: "API authentication is not configured" }, /configuration repair/],
    [{ code: "api_authentication_unconfigured" }, /configuration repair/],
    [{ detail: "The online service is temporarily unavailable" }, /temporarily unreachable or busy/],
    [{ code: "backend_unavailable" }, /temporarily unreachable or busy/],
    [{ code: "backend_timeout" }, /took too long/],
  ])("distinguishes recoverable 503 cause %j", async (body, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 503, json: async () => body,
    }));
    await expect(fetchBackendPrediction(full())).rejects.toThrow(message);
    await expect(fetchBackendPrediction(full())).rejects.toThrow(/inputs are preserved/);
  });
  it.each([null, [], "<html>SECRET_INTERNAL_DETAIL</html>", { detail: "SECRET_INTERNAL_DETAIL" }, { detail: { code: "SECRET_INTERNAL_DETAIL" } }])(
    "does not expose unrecognized error bodies %j", async (body) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false, status: 503, json: async () => body}));
      await expect(fetchBackendPrediction(full())).rejects.toThrow(/temporarily unreachable or busy/);
      await expect(fetchBackendPrediction(full())).rejects.not.toThrow(/SECRET_INTERNAL_DETAIL|trained model/);
    },
  );
  it("handles an HTML or empty gateway failure without misreporting a missing model", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false, status: 503, json: async () => {throw new SyntaxError("SECRET_INTERNAL_DETAIL");}}));
    await expect(fetchBackendPrediction(full())).rejects.toThrow(/temporarily unreachable or busy/);
  });
  it.each([[502, /temporarily unreachable or busy/], [504, /took too long/]])(
    "offers recovery for gateway HTTP %s", async (status, message) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false, status, json: async () => ({})}));
      await expect(fetchBackendPrediction(full())).rejects.toThrow(message);
    },
  );
  it("rejects malformed JSON and invalid model responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...response, probability: 9 }),
      }),
    );
    await expect(fetchBackendPrediction(full())).rejects.toThrow(
      /invalid model response/,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("bad JSON");
        },
      }),
    );
    await expect(fetchBackendPrediction(full())).rejects.toThrow(
      PredictionApiError,
    );
  });
  it("settles timeouts and propagates external cancellation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            const abort = () =>
              reject(new DOMException("aborted", "AbortError"));
            if (options.signal?.aborted) abort();
            else
              options.signal?.addEventListener("abort", abort, { once: true });
          }),
      ),
    );
    await expect(
      fetchBackendPrediction(full(), { timeoutMs: 5 }),
    ).rejects.toThrow(/cancelled or timed out/);
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchBackendPrediction(full(), { signal: controller.signal }),
    ).rejects.toThrow(/cancelled or timed out/);
  });
});
