import { describe, it, expect } from "vitest";
import { checkSpeciesCompatibility } from "./speciesCompatibility";
import type { WaterParameters } from "../types";

describe("checkSpeciesCompatibility", () => {
  it("flags high risk when salinity falls outside vannamei's tolerance range", () => {
    const params: WaterParameters = { salinityPpt: 0.3, pH: 7.5 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.riskLevel).toBe("high");
    expect(result.vannamei.deviations.some((d) => d.message.includes("salinity"))).toBe(true);
  });

  it("reports low risk with no deviations when salinity is within tolerance and no ionic data given", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.riskLevel).toBe("low");
  });

  it("flags Na:K ratio deviation from the Ch.3 target of 27 when ion data is available", () => {
    // Sodium far above target ratio relative to potassium (K critically low).
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, sodiumMgL: 4500, potassiumMgL: 20 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.deviations.some((d) => d.message.includes("Na:K"))).toBe(true);
  });

  it("skips unknown species ids without throwing", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = checkSpeciesCompatibility(params, ["unknown-species"]);
    expect(result["unknown-species"]).toBeUndefined();
  });

  it("flags zero potassium as a critical deviation and escalates risk to high, not a silent skip", () => {
    // riskLevel now escalates to "high" whenever ANY deviation is
    // critical-severity, not just when it's a count-of-1-vs-2 heuristic --
    // a single critical deviation (zero potassium) deserves high risk on
    // its own, not "moderate" just because it's the only issue found.
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, sodiumMgL: 4500, potassiumMgL: 0 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.deviations.some((d) => d.message.includes("potassium reading is 0"))).toBe(true);
    expect(result.vannamei.riskLevel).toBe("high");
  });

  it("treats exceeding the upper salinity bound as an operating-scope issue (action), not automatically critical, when the species profile says so", () => {
    // vannamei's 30 ppt upper bound is this app's own Ch.10 routing
    // boundary, not a survival ceiling -- found during field-testing,
    // 2026-08-05 (real trials show 95%+ survival at 45 ppt).
    const params: WaterParameters = { salinityPpt: 32, pH: 8.0 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    const deviation = result.vannamei.deviations.find((d) => d.message.includes("salinity"));
    expect(deviation?.severity).toBe("action");
    expect(deviation?.message).toContain("operating-scope");
  });

  it("still treats a below-range salinity violation as critical, with no operating-scope downgrade", () => {
    const params: WaterParameters = { salinityPpt: 0.3, pH: 7.5 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    const deviation = result.vannamei.deviations.find((d) => d.message.includes("salinity"));
    expect(deviation?.severity).toBe("critical");
  });
});
