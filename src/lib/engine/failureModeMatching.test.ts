import { describe, it, expect } from "vitest";
import { matchFailureModes } from "./failureModeMatching";

describe("matchFailureModes", () => {
  it("matches molt-failure/soft-shell when potassium is below the Ch.6 §2 documented failure point", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.5, potassiumMgL: 7 });
    expect(matches.some((m) => m.id === "molt-failure-soft-shell")).toBe(true);
  });

  it("does not match molt-failure when potassium is comfortably in the adequate range", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.5, potassiumMgL: 25 });
    expect(matches.some((m) => m.id === "molt-failure-soft-shell")).toBe(false);
  });

  it("returns an empty array when no related parameters are present", () => {
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8 });
    expect(matches).toEqual([]);
  });

  it("matches dissolved-oxygen-crash below the 2 mg/L emergency threshold (Ch.7 §3)", () => {
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8, doMgL: 1.5 });
    expect(matches.some((m) => m.id === "dissolved-oxygen-crash")).toBe(true);
    expect(matches.find((m) => m.id === "dissolved-oxygen-crash")?.severity).toBe("critical");
  });

  it("does not match dissolved-oxygen-crash at a comfortable DO reading", () => {
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8, doMgL: 6 });
    expect(matches.some((m) => m.id === "dissolved-oxygen-crash")).toBe(false);
  });

  it("matches ammonia-toxicity at or above the 5 mg/L TAN threshold, using the in-pond field, not the source-baseline ammonium field (Ch.7 §4)", () => {
    // Real documented case: TAN 19 mg/L caused 80.55% mortality.
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8, tanMgL: 19 });
    expect(matches.some((m) => m.id === "ammonia-toxicity")).toBe(true);
  });

  it("does NOT match ammonia-toxicity when the same reading is entered as source-baseline ammonium instead of TAN", () => {
    // Confirms tanMgL and ammoniumMgL are genuinely separate, not aliases.
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8, ammoniumMgL: 19 });
    expect(matches.some((m) => m.id === "ammonia-toxicity")).toBe(false);
  });

  it("matches nitrite-toxicity at or above the 5 mg/L immune-suppression threshold (Ch.7 §5)", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.6, nitriteMgL: 9 });
    expect(matches.some((m) => m.id === "nitrite-toxicity")).toBe(true);
  });

  it("does not match nitrite-toxicity below the threshold", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.6, nitriteMgL: 0.3 });
    expect(matches.some((m) => m.id === "nitrite-toxicity")).toBe(false);
  });

  it("matches ammonia-toxicity via the precise un-ionized calc even when TAN alone is below the flat 5 mg/L threshold, given a high pH/temperature combination", () => {
    // pH 9 / 30C pushes ~44% of TAN into the toxic un-ionized form -- 2 mg/L
    // TAN here works out to ~0.89 mg/L NH3, above the 0.69 mg/L LC50 floor,
    // even though 2 mg/L TAN alone would never trip the flat screen.
    const matches = matchFailureModes({ salinityPpt: 15, pH: 9, temperatureC: 30, tanMgL: 2 });
    expect(matches.some((m) => m.id === "ammonia-toxicity")).toBe(true);
  });

  it("does NOT match ammonia-toxicity via the precise calc when TAN is above the flat threshold but pH/temperature are low enough to keep the un-ionized fraction negligible", () => {
    // pH 7 / 20C pushes under 0.4% of TAN into the toxic form -- 6 mg/L TAN
    // (above the flat 5 mg/L screen) works out to ~0.02 mg/L NH3, nowhere
    // near the 0.69 mg/L LC50 floor. Confirms the precise calc genuinely
    // uses real chemistry rather than being a strictly more-conservative
    // superset of the flat screen.
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7, temperatureC: 20, tanMgL: 6 });
    expect(matches.some((m) => m.id === "ammonia-toxicity")).toBe(false);
  });

  it("falls back to the flat TAN threshold when temperature isn't provided, even if pH is", () => {
    const matches = matchFailureModes({ salinityPpt: 15, pH: 9, tanMgL: 6 });
    expect(matches.some((m) => m.id === "ammonia-toxicity")).toBe(true);
  });

  it("can match multiple failure modes at once without one masking another", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.6, doMgL: 1, tanMgL: 6, nitriteMgL: 8, potassiumMgL: 5 });
    const ids = matches.map((m) => m.id).sort();
    expect(ids).toEqual(["ammonia-toxicity", "dissolved-oxygen-crash", "molt-failure-soft-shell", "nitrite-toxicity"]);
  });
});
