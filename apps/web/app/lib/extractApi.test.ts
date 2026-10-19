import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractFromDocument,
  extractionToAssessmentPatch,
  ExtractionApiError,
} from "./extractApi";

afterEach(() => vi.unstubAllGlobals());
const extracted = (values: Record<string, number>) => ({
  extracted_values: values,
  confidence: {},
});
describe("optional report extraction", () => {
  it("retains only supplied measurements and never invents diabetes or a cholesterol concentration", () => {
    const patch = extractionToAssessmentPatch(
      extracted({ age: 58, cholesterol: 2, gluc: 3 }),
    );
    expect(patch).toEqual({
      age: 58,
      cholesterolCategory: 2,
      glucoseCategory: 3,
    });
    expect(patch).not.toHaveProperty("diabetes");
    expect(patch).not.toHaveProperty("totalCholesterol");
    expect(patch).not.toHaveProperty("sex");
  });
  it("rejects invalid extracted values while preserving legitimate zero binary values", () => {
    expect(
      extractionToAssessmentPatch(
        extracted({
          age: 900,
          sex: 5,
          height: 0,
          weight: Infinity,
          ap_hi: 20,
          ap_lo: 900,
          cholesterol: 9,
          gluc: 0,
          smoke: 0,
          alco: 0,
          active: 0,
        }),
      ),
    ).toEqual({
      smoking: false,
      smokingStatus: "never",
      alcohol: false,
      activityLevel: "low",
    });
  });
  it("leaves a partial report partial for whole-form review", () => {
    expect(extractionToAssessmentPatch(extracted({}))).toEqual({});
  });
  it("blocks legacy DOC and oversized files before transmitting anything", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      extractFromDocument(new File(["synthetic"], "report.doc")),
    ).rejects.toThrow(/PDF or DOCX/);
    const file = new File(["synthetic"], "report.pdf");
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });
    await expect(extractFromDocument(file)).rejects.toThrow(/10 MB/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("surfaces missing-provider failure and permits manual-entry recovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ detail: "Extraction provider unavailable" }),
      }),
    );
    await expect(
      extractFromDocument(new File(["synthetic"], "report.pdf")),
    ).rejects.toThrow(ExtractionApiError);
  });
  it("rejects invalid provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ wrong: "schema" }),
      }),
    );
    await expect(
      extractFromDocument(new File(["synthetic"], "report.pdf")),
    ).rejects.toThrow(/invalid/);
  });
});
