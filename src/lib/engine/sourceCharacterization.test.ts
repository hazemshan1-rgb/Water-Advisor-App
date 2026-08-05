// src/lib/engine/sourceCharacterization.test.ts
import { describe, it, expect } from "vitest";
import { classifySourceBySalinity, checkSourceRedFlags, characterizeSource } from "./sourceCharacterization";
import type { WaterParameters } from "../types";

describe("classifySourceBySalinity", () => {
  it("flags salinity at or above 30 ppt as hypersaline, routed to Ch.10", () => {
    const result = classifySourceBySalinity(32);
    expect(result.band).toBe("hypersaline");
    expect(result.routeToChapter).toContain("Ch.10");
  });

  it("routes 10-<30 ppt to the standard synthetic seawater build (Ch.3)", () => {
    const result = classifySourceBySalinity(15);
    expect(result.band).toBe("standard-10-25");
    expect(result.routeToChapter).toContain("Ch.3");
  });

  it("routes 1-5 ppt to the ultra-low salinity protocol (Ch.6)", () => {
    const result = classifySourceBySalinity(2);
    expect(result.band).toBe("ultra-low-1-5");
    expect(result.routeToChapter).toContain("Ch.6");
  });

  it("flags below 1 ppt as the zero-salinity edge case requiring senior review", () => {
    const result = classifySourceBySalinity(0.5);
    expect(result.band).toBe("zero-salinity-edge");
  });

  it("honestly reports the 5-10 ppt band as an unclassified gap in the source decision tree", () => {
    const result = classifySourceBySalinity(7);
    expect(result.band).toBe("unclassified-gap");
  });

  // Boundary tests at every real branch point in classifySourceBySalinity.
  // (25 ppt is not a branch in this function -- the "standard" band runs
  // 10-<30 as one piece, with only its advisory note changing at 20 ppt --
  // so it's deliberately not tested here as a band boundary.)
  it("treats exactly 1.0 ppt as ultra-low, not the zero-salinity edge case", () => {
    expect(classifySourceBySalinity(0.9).band).toBe("zero-salinity-edge");
    expect(classifySourceBySalinity(1.0).band).toBe("ultra-low-1-5");
    expect(classifySourceBySalinity(1.1).band).toBe("ultra-low-1-5");
  });

  it("treats exactly 5.0 ppt as the unclassified gap, not ultra-low", () => {
    expect(classifySourceBySalinity(4.9).band).toBe("ultra-low-1-5");
    expect(classifySourceBySalinity(5.0).band).toBe("unclassified-gap");
    expect(classifySourceBySalinity(5.1).band).toBe("unclassified-gap");
  });

  it("treats exactly 10.0 ppt as standard, not the unclassified gap", () => {
    expect(classifySourceBySalinity(9.9).band).toBe("unclassified-gap");
    expect(classifySourceBySalinity(10.0).band).toBe("standard-10-25");
    expect(classifySourceBySalinity(10.1).band).toBe("standard-10-25");
  });

  it("treats exactly 30.0 ppt as hypersaline, not standard", () => {
    expect(classifySourceBySalinity(29.9).band).toBe("standard-10-25");
    expect(classifySourceBySalinity(30.0).band).toBe("hypersaline");
    expect(classifySourceBySalinity(30.1).band).toBe("hypersaline");
  });
});

describe("checkSourceRedFlags", () => {
  it("flags hardness more than 2x alkalinity as a Ca-dominant, non-buffering water", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, hardnessMgL: 300, alkalinityMgL: 100 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("Ca-dominant"))).toBe(true);
  });

  it("flags potassium below the 5 mg/L watch line", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, potassiumMgL: 3 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("potassium") && f.message.includes("watch"))).toBe(true);
  });

  it("flags potassium below the 2 mg/L action trigger with higher severity language", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, potassiumMgL: 1 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("potassium") && f.message.includes("mandatory fortification"))).toBe(true);
  });

  it("flags chloride below 300 mg/L at low salinity (<5 ppt) per the nitrite-protection floor", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, chlorideMgL: 200 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("chloride"))).toBe(true);
  });

  it("does not flag chloride at 10 ppt where the low-salinity floor doesn't apply", () => {
    const params: WaterParameters = { salinityPpt: 10, pH: 7.8, chlorideMgL: 200 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("chloride"))).toBe(false);
  });

  it("flags magnesium below the 3 mg/L floor at low salinity (1-5 ppt)", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, magnesiumMgL: 2 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("magnesium"))).toBe(true);
  });

  it("does not flag magnesium when adequate at low salinity", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, magnesiumMgL: 20 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("magnesium"))).toBe(false);
  });

  it("flags iron above the 0.3 mg/L action trigger as critical (blocks pond use until treated)", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, ironMgL: 0.5 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("Iron"));
    expect(flag?.severity).toBe("critical");
  });

  it("flags iron above the 0.1 mg/L watch line as watch, not critical", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, ironMgL: 0.15 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("Iron"));
    expect(flag?.severity).toBe("watch");
  });

  it("flags manganese above the 0.1 mg/L action trigger as critical", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, manganeseMgL: 0.2 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("Manganese"));
    expect(flag?.severity).toBe("critical");
  });

  it("flags any detectable hydrogen sulfide as critical -- the guide gives no watch tier for H2S", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, hydrogenSulfideMgL: 0.01 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("Hydrogen sulfide"));
    expect(flag?.severity).toBe("critical");
  });

  it("does not flag hydrogen sulfide at exactly zero", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, hydrogenSulfideMgL: 0 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("Hydrogen sulfide"))).toBe(false);
  });

  it("flags arsenic above the 0.01 mg/L watch line as critical -- guide says do not use without treatment", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, arsenicMgL: 0.02 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("Arsenic"));
    expect(flag?.severity).toBe("critical");
  });

  it("flags native ammonium as a deliberately downgraded severity, not action/critical", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, ammoniumMgL: 1.5 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("ammonium"));
    // Guide explicitly says "not a pond-management failure" -- action-trigger
    // level ammonium is capped at "watch", never "action" or "critical".
    expect(flag?.severity).toBe("watch");
  });

  it("flags a real contradiction: high salinity with critically low chloride", () => {
    // Physically inconsistent for a natural source, but the app should
    // still report the chloride check exactly as configured rather than
    // silently reconciling it -- the low-salinity chloride floor only
    // applies below 5 ppt, so this should NOT fire, and that's the point:
    // no hidden cross-parameter "smoothing" logic exists.
    const params: WaterParameters = { salinityPpt: 20, pH: 8.0, chlorideMgL: 50 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.message.includes("chloride"))).toBe(false);
  });

  it("flags a real contradiction: high hardness with very low alkalinity as Ca-dominant", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, hardnessMgL: 500, alkalinityMgL: 40 };
    const flags = checkSourceRedFlags(params);
    const flag = flags.find((f) => f.message.includes("Ca-dominant"));
    expect(flag?.severity).toBe("action");
  });

  it("returns no flags at all when only salinity and pH are provided (nothing to check)", () => {
    const flags = checkSourceRedFlags({ salinityPpt: 15, pH: 7.8 });
    expect(flags).toEqual([]);
  });
});

describe("characterizeSource", () => {
  it("combines salinity banding and red flags using the Nalgonda worked example (Ch.6 Section 8)", () => {
    // Real district-mean profile from the guide's worked example.
    const params: WaterParameters = {
      salinityPpt: 2,
      tdsMgL: 1411,
      potassiumMgL: 8.4,
      magnesiumMgL: 92.3,
      chlorideMgL: 657,
      pH: 7.6,
    };
    const anomalies = characterizeSource(params);
    expect(anomalies.some((a) => a.message.includes("Ch.6"))).toBe(true);
    // K+ at 8.4 mg/L clears the 5 mg/L watch line but the chapter warns individual
    // wells can run much lower — no watch flag should fire at this specific value.
    expect(anomalies.some((a) => a.message.includes("potassium"))).toBe(false);
  });

  it("surfaces a blocking contaminant flag BEFORE the salinity band note, matching Ch.2 §4's own decision-tree order", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, hydrogenSulfideMgL: 0.02 };
    const anomalies = characterizeSource(params);
    const h2sIndex = anomalies.findIndex((a) => a.message.includes("Hydrogen sulfide"));
    const bandIndex = anomalies.findIndex((a) => a.message.includes("Salinity band"));
    expect(h2sIndex).toBeGreaterThanOrEqual(0);
    expect(bandIndex).toBeGreaterThanOrEqual(0);
    expect(h2sIndex).toBeLessThan(bandIndex);
  });

  it("marks the zero-salinity-edge band note itself as critical severity", () => {
    const anomalies = characterizeSource({ salinityPpt: 0.5, pH: 7.5 });
    const bandAnomaly = anomalies.find((a) => a.message.includes("Salinity band"));
    expect(bandAnomaly?.severity).toBe("critical");
  });

  it("marks the unclassified-gap band note as watch severity, not critical", () => {
    const anomalies = characterizeSource({ salinityPpt: 7, pH: 7.7 });
    const bandAnomaly = anomalies.find((a) => a.message.includes("Salinity band"));
    expect(bandAnomaly?.severity).toBe("watch");
  });

  it("returns only the salinity band note when given only salinity and pH (missing-data case)", () => {
    const anomalies = characterizeSource({ salinityPpt: 15, pH: 7.8 });
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].message).toContain("Salinity band");
  });
});
