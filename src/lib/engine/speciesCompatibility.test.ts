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

  describe("postlarval direct-transfer shock (Ogle et al. 1992)", () => {
    it("does nothing when postlarvalAgeDays isn't provided, even at a risky salinity", () => {
      const params: WaterParameters = { salinityPpt: 4, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"]);
      expect(result.vannamei.deviations.some((d) => d.message.includes("postlarva"))).toBe(false);
    });

    it("flags critical risk for an 8-day-old postlarva direct-transferred to 8 ppt", () => {
      const params: WaterParameters = { salinityPpt: 8, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"], 8);
      const dev = result.vannamei.deviations.find((d) => d.message.includes("19.8%"));
      expect(dev?.severity).toBe("critical");
      expect(result.vannamei.riskLevel).toBe("high");
    });

    it("flags only a watch-level caution for an 8-day-old postlarva at 16 ppt, where documented survival is still 92.8%", () => {
      const params: WaterParameters = { salinityPpt: 16, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"], 8);
      const dev = result.vannamei.deviations.find((d) => d.message.includes("92.8%"));
      expect(dev?.severity).toBe("watch");
    });

    it("does not flag an 8-day-old postlarva at a comfortably high salinity (32 ppt)", () => {
      const params: WaterParameters = { salinityPpt: 32, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"], 8);
      expect(result.vannamei.deviations.some((d) => d.message.includes("postlarva"))).toBe(false);
    });

    it("flags a documented-gap watch note for an age between PL-8 and PL-22 at a risky salinity, without assuming PL-22-level tolerance", () => {
      const params: WaterParameters = { salinityPpt: 6, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"], 15);
      const dev = result.vannamei.deviations.find((d) => d.message.includes("No direct survival data"));
      expect(dev?.severity).toBe("watch");
    });

    it("still flags a real, lower-severity risk for a 22-day-old postlarva at 2 ppt, not a silent pass", () => {
      const params: WaterParameters = { salinityPpt: 2, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"], 25);
      const dev = result.vannamei.deviations.find((d) => d.message.includes("40.2%"));
      expect(dev?.severity).toBe("action");
    });

    it("does not flag a 22-day-old postlarva at 16 ppt, where documented survival is 97.8%", () => {
      const params: WaterParameters = { salinityPpt: 16, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["vannamei"], 30);
      expect(result.vannamei.deviations.some((d) => d.message.includes("postlarva") || d.message.includes("Documented direct-transfer"))).toBe(false);
    });

    it("does not affect species with no directTransferSalinityShock data (e.g. tilapia)", () => {
      const params: WaterParameters = { salinityPpt: 8, pH: 7.8 };
      const result = checkSpeciesCompatibility(params, ["tilapia"], 8);
      expect(result.tilapia.deviations).toEqual([]);
    });
  });
});
