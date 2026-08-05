import { describe, it, expect } from "vitest";
import { checkSpeciesCompatibility } from "./speciesCompatibility";
import type { WaterParameters } from "../types";

describe("checkSpeciesCompatibility", () => {
  it("flags high risk when salinity falls outside vannamei's tolerance range", () => {
    const params: WaterParameters = { salinityPpt: 0.3, pH: 7.5 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.riskLevel).toBe("high");
    expect(result.vannamei.deviations.some((d) => d.includes("salinity"))).toBe(true);
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
    expect(result.vannamei.deviations.some((d) => d.includes("Na:K"))).toBe(true);
  });

  it("skips unknown species ids without throwing", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = checkSpeciesCompatibility(params, ["unknown-species"]);
    expect(result["unknown-species"]).toBeUndefined();
  });
});
