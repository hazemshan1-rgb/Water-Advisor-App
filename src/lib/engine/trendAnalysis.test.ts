import { describe, it, expect } from "vitest";
import { detectTrends } from "./trendAnalysis";
import type { Analysis } from "../types";

function makeAnalysis(date: string, overrides: Partial<Analysis["parameters"]>): Analysis {
  return {
    id: date,
    siteId: "site-1",
    date,
    parameters: { salinityPpt: 15, pH: 7.8, ...overrides },
    targetSpeciesIds: ["vannamei"],
  };
}

describe("detectTrends", () => {
  it("does not flag anything with fewer than 3 readings for a field", () => {
    const history = [makeAnalysis("2026-08-01", { doMgL: 6 }), makeAnalysis("2026-08-02", { doMgL: 5 })];
    expect(detectTrends(history)).toEqual([]);
  });

  it("flags a worsening DO trend (falling across 3 readings) while still above the 2 mg/L acute threshold", () => {
    const history = [
      makeAnalysis("2026-08-01", { doMgL: 6 }),
      makeAnalysis("2026-08-02", { doMgL: 4.5 }),
      makeAnalysis("2026-08-03", { doMgL: 3 }),
    ];
    const anomalies = detectTrends(history);
    expect(anomalies.some((a) => a.message.includes("Dissolved oxygen"))).toBe(true);
    expect(anomalies.find((a) => a.message.includes("Dissolved oxygen"))?.severity).toBe("watch");
  });

  it("does NOT flag a DO trend once the latest reading has already crossed the 2 mg/L acute threshold -- matchFailureModes.ts already covers that case", () => {
    const history = [
      makeAnalysis("2026-08-01", { doMgL: 6 }),
      makeAnalysis("2026-08-02", { doMgL: 3 }),
      makeAnalysis("2026-08-03", { doMgL: 1.5 }),
    ];
    const anomalies = detectTrends(history);
    expect(anomalies.some((a) => a.message.includes("Dissolved oxygen"))).toBe(false);
  });

  it("flags a worsening TAN trend (rising across 3 readings) while still below the 5 mg/L acute threshold", () => {
    const history = [
      makeAnalysis("2026-08-01", { tanMgL: 1.5 }),
      makeAnalysis("2026-08-02", { tanMgL: 2.8 }),
      makeAnalysis("2026-08-03", { tanMgL: 4.2 }),
    ];
    const anomalies = detectTrends(history);
    const tanFlag = anomalies.find((a) => a.message.includes("Total ammonia nitrogen"));
    expect(tanFlag).toBeDefined();
    expect(tanFlag?.message).toContain("1.5 mg/L");
    expect(tanFlag?.message).toContain("4.2 mg/L");
  });

  it("flags a worsening nitrite trend (rising across 3 readings) while still below the 5 mg/L acute threshold", () => {
    const history = [
      makeAnalysis("2026-08-01", { nitriteMgL: 1 }),
      makeAnalysis("2026-08-02", { nitriteMgL: 2 }),
      makeAnalysis("2026-08-03", { nitriteMgL: 3.5 }),
    ];
    const anomalies = detectTrends(history);
    expect(anomalies.some((a) => a.message.includes("Nitrite-nitrogen"))).toBe(true);
  });

  it("does not flag a non-monotonic (up-then-down) trend", () => {
    const history = [
      makeAnalysis("2026-08-01", { tanMgL: 1.5 }),
      makeAnalysis("2026-08-02", { tanMgL: 3.5 }),
      makeAnalysis("2026-08-03", { tanMgL: 2 }),
    ];
    expect(detectTrends(history)).toEqual([]);
  });

  it("sorts by date internally, so out-of-order input still detects the correct trend", () => {
    const history = [
      makeAnalysis("2026-08-03", { doMgL: 3 }),
      makeAnalysis("2026-08-01", { doMgL: 6 }),
      makeAnalysis("2026-08-02", { doMgL: 4.5 }),
    ];
    const anomalies = detectTrends(history);
    expect(anomalies.some((a) => a.message.includes("Dissolved oxygen"))).toBe(true);
  });

  it("evaluates only the most recent 3 readings, so an older break in the trend doesn't block detection", () => {
    const history = [
      makeAnalysis("2026-07-30", { doMgL: 2.5 }), // would break monotonicity if included
      makeAnalysis("2026-08-01", { doMgL: 6 }),
      makeAnalysis("2026-08-02", { doMgL: 4.5 }),
      makeAnalysis("2026-08-03", { doMgL: 3 }),
    ];
    const anomalies = detectTrends(history);
    expect(anomalies.some((a) => a.message.includes("Dissolved oxygen"))).toBe(true);
  });

  it("returns an empty array for an empty history", () => {
    expect(detectTrends([])).toEqual([]);
  });
});
