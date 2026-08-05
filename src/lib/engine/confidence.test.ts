import { describe, it, expect } from "vitest";
import { computeConfidence } from "./confidence";
import type { WaterParameters } from "../types";

const FULL_PARAMS: WaterParameters = {
  salinityPpt: 15,
  pH: 7.8,
  sodiumMgL: 4500,
  potassiumMgL: 160,
  calciumMgL: 400,
  magnesiumMgL: 500,
  chlorideMgL: 8000,
  alkalinityMgL: 120,
  hardnessMgL: 900,
  ironMgL: 0.05,
  manganeseMgL: 0.02,
  hydrogenSulfideMgL: 0,
  arsenicMgL: 0,
  ammoniumMgL: 0.1,
  doMgL: 6,
  tanMgL: 0.5,
  nitriteMgL: 0.1,
};

describe("computeConfidence", () => {
  it("returns high confidence with no data gaps when every key field is present and salinity is in a documented band", () => {
    const result = computeConfidence(FULL_PARAMS);
    expect(result.confidence).toBe("high");
    expect(result.dataGaps).toEqual([]);
  });

  it("lists a data gap with a concrete stake for each missing key field", () => {
    const result = computeConfidence({ salinityPpt: 15, pH: 7.8 });
    expect(result.dataGaps.length).toBeGreaterThan(0);
    expect(result.dataGaps.some((g) => g.includes("potassium") && g.includes("molt-failure"))).toBe(true);
  });

  it("caps confidence at medium with 3-5 missing key fields", () => {
    const result = computeConfidence({ ...FULL_PARAMS, ironMgL: undefined, manganeseMgL: undefined, arsenicMgL: undefined });
    expect(result.confidence).toBe("medium");
  });

  it("caps confidence at low with 6+ missing key fields", () => {
    const result = computeConfidence({ salinityPpt: 15, pH: 7.8, potassiumMgL: 160 });
    expect(result.confidence).toBe("low");
  });

  it("caps confidence at medium for the 5-10 ppt gap band even with complete data", () => {
    const result = computeConfidence({ ...FULL_PARAMS, salinityPpt: 7 });
    expect(result.confidence).toBe("medium");
    expect(result.confidenceReasons.some((r) => r.includes("5-10 ppt"))).toBe(true);
  });

  it("caps confidence at low for the zero-salinity edge case even with complete data", () => {
    const result = computeConfidence({ ...FULL_PARAMS, salinityPpt: 0.5 });
    expect(result.confidence).toBe("low");
    expect(result.confidenceReasons.some((r) => r.includes("senior review"))).toBe(true);
  });

  it("takes the more restrictive of band-cap and completeness-cap, not an average", () => {
    // Zero-edge band alone would cap at "low"; missing data alone would cap at "medium".
    // The combined result must be the more restrictive: low.
    const result = computeConfidence({ salinityPpt: 0.5, pH: 7.5, potassiumMgL: 10, magnesiumMgL: 20, sodiumMgL: 100 });
    expect(result.confidence).toBe("low");
  });
});
