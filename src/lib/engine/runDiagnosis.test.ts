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
});
