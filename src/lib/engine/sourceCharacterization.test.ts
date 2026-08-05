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
});

describe("checkSourceRedFlags", () => {
  it("flags hardness more than 2x alkalinity as a Ca-dominant, non-buffering water", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, hardnessMgL: 300, alkalinityMgL: 100 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("Ca-dominant"))).toBe(true);
  });

  it("flags potassium below the 5 mg/L watch line", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, potassiumMgL: 3 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("potassium") && f.includes("watch"))).toBe(true);
  });

  it("flags potassium below the 2 mg/L action trigger with higher severity language", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, potassiumMgL: 1 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("potassium") && f.includes("mandatory fortification"))).toBe(true);
  });

  it("flags chloride below 300 mg/L at low salinity (<5 ppt) per the nitrite-protection floor", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, chlorideMgL: 200 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("chloride"))).toBe(true);
  });

  it("does not flag chloride at 10 ppt where the low-salinity floor doesn't apply", () => {
    const params: WaterParameters = { salinityPpt: 10, pH: 7.8, chlorideMgL: 200 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("chloride"))).toBe(false);
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
    expect(anomalies.some((a) => a.includes("Ch.6"))).toBe(true);
    // K+ at 8.4 mg/L clears the 5 mg/L watch line but the chapter warns individual
    // wells can run much lower — no watch flag should fire at this specific value.
    expect(anomalies.some((a) => a.includes("potassium"))).toBe(false);
  });
});
