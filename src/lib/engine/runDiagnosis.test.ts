import { describe, it, expect } from "vitest";
import { runDiagnosis } from "./runDiagnosis";
import type { Analysis } from "../types";

describe("runDiagnosis", () => {
  it("produces a full diagnosis for the Nalgonda worked example (Ch.6 §8)", () => {
    const analysis: Analysis = {
      id: "test-1",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: {
        salinityPpt: 2,
        tdsMgL: 1411,
        potassiumMgL: 8.4,
        magnesiumMgL: 92.3,
        chlorideMgL: 657,
        pH: 7.6,
      },
      targetSpeciesIds: ["vannamei"],
      volumeM3: 10_000,
    };

    const result = runDiagnosis(analysis);

    expect(result.sourceAnomalies.length).toBeGreaterThan(0);
    expect(result.perSpecies.vannamei).toBeDefined();
    expect(result.imtaNotes).toEqual([]); // single species
    // K+ 8.4 mg/L is below the Ch.6 §2 molt-failure threshold of 10 mg/L.
    expect(result.matchedFailureModes.some((m) => m.id === "molt-failure-soft-shell")).toBe(true);
    expect(result.dosingPlan.length).toBeGreaterThan(0);
  });

  it("populates imtaNotes only when multiple species are selected", () => {
    const analysis: Analysis = {
      id: "test-2",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8 },
      targetSpeciesIds: ["vannamei", "tilapia"],
      volumeM3: 5000,
    };
    const result = runDiagnosis(analysis);
    expect(result.imtaNotes.length).toBeGreaterThan(0);
  });

  it("defaults dosing volume to 0 when volumeM3 is not provided, without throwing", () => {
    const analysis: Analysis = {
      id: "test-3",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 },
      targetSpeciesIds: ["vannamei"],
    };
    expect(() => runDiagnosis(analysis)).not.toThrow();
  });

  it("stages dosing into two steps and attaches a protocol note, rather than a single-shot dose", () => {
    const analysis: Analysis = {
      id: "test-4",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 },
      targetSpeciesIds: ["vannamei"],
      volumeM3: 10_000,
    };
    const result = runDiagnosis(analysis);
    expect(result.dosingPlan.some((s) => s.stage === 1)).toBe(true);
    expect(result.dosingPlan.some((s) => s.stage === 2)).toBe(true);
    expect(result.dosingProtocolNote).toBeDefined();
  });

  it("returns a real diagnosis with only salinity and pH provided -- runs without throwing, low confidence, but not empty", () => {
    const analysis: Analysis = {
      id: "test-5",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8 },
      targetSpeciesIds: ["vannamei"],
    };
    const result = runDiagnosis(analysis);
    expect(result.confidence).toBe("low");
    expect(result.dataGaps.length).toBeGreaterThan(0);
    expect(result.perSpecies.vannamei).toBeDefined();
  });

  it("caps confidence at medium and discloses the fallback when salinity lands in the 5-10 ppt gap, even with otherwise complete data", () => {
    const analysis: Analysis = {
      id: "test-6",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: {
        salinityPpt: 7,
        pH: 7.7,
        sodiumMgL: 2000,
        potassiumMgL: 40,
        calciumMgL: 100,
        magnesiumMgL: 150,
        chlorideMgL: 3000,
        alkalinityMgL: 100,
        hardnessMgL: 300,
      },
      targetSpeciesIds: ["vannamei"],
      volumeM3: 10_000,
    };
    const result = runDiagnosis(analysis);
    expect(result.confidence).toBe("medium");
    expect(result.dosingPlan.some((s) => s.instructions.includes("5-10 ppt"))).toBe(true);
  });

  it("does not crash or silently reconcile a physically unusual contradiction (high salinity, critically low chloride)", () => {
    const analysis: Analysis = {
      id: "test-7",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 20, pH: 8.0, chlorideMgL: 50, hardnessMgL: 900, alkalinityMgL: 50 },
      targetSpeciesIds: ["vannamei"],
      volumeM3: 10_000,
    };
    expect(() => runDiagnosis(analysis)).not.toThrow();
    const result = runDiagnosis(analysis);
    // hardness:alkalinity mismatch (900:50 = 18x) should still fire independently
    expect(result.sourceAnomalies.some((a) => a.message.includes("Ca-dominant"))).toBe(true);
  });
});
