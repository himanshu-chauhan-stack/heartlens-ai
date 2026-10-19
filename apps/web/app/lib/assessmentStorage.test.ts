import { describe, expect, it } from "vitest";
import { restoreAssessment } from "./assessmentStorage";
import { createEmptyAssessment } from "./risk";
describe("versioned partial draft recovery", () => {
  it("preserves partial canonical values and fills newly introduced fields", () => {
    const { glucoseCategory: unused, ...legacy } = createEmptyAssessment();
    void unused;
    const restored = restoreAssessment({
      ...legacy,
      age: 52,
      weightKg: 70.5,
      sex: "female",
    });
    expect(restored).toMatchObject({
      age: 52,
      weightKg: 70.5,
      sex: "female",
      glucoseCategory: null,
    });
  });
  it.each([
    null,
    [],
    {},
    { unknownVitals: null },
    { ...createEmptyAssessment(), age: "52" },
    { ...createEmptyAssessment(), unknownVitals: { systolicBp: "false" } },
    { ...createEmptyAssessment(), sex: "unknown" },
  ])("rejects corrupt draft %j", (value) =>
    expect(restoreAssessment(value)).toBeNull(),
  );
  it("keeps explicit synthetic input provenance without arbitrary fields", () => {
    const restored = restoreAssessment({
      ...createEmptyAssessment(),
      importSource: "synthetic_sample",
      importNotes: "Sample",
      unexpected: "ignored",
    });
    expect(restored?.importSource).toBe("synthetic_sample");
    expect(restored).not.toHaveProperty("unexpected");
  });
});
