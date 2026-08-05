import { describe, it, expect } from "vitest";
import { SPECIES, getSpeciesById } from "./species";

describe("species knowledge base", () => {
  it("includes a vannamei profile with the Ch.3 master ionic ratio", () => {
    const vannamei = getSpeciesById("vannamei");
    expect(vannamei).toBeDefined();
    // Ch.3 Part 2: Na:Mg:Ca:K = 27:3:1:1
    expect(vannamei?.idealIonicRatios["Na:K"]).toBe(27);
    expect(vannamei?.idealIonicRatios["Mg:Ca"]).toBe(3);
  });

  it("returns undefined for an unknown species id", () => {
    expect(getSpeciesById("nonexistent")).toBeUndefined();
  });

  it("every species profile carries a source citation", () => {
    for (const s of SPECIES) {
      expect(s.sourceCitation.length).toBeGreaterThan(0);
    }
  });

  it("includes a Nile tilapia profile with the Metwaly et al. (2025) tolerance band", () => {
    const tilapia = getSpeciesById("tilapia");
    expect(tilapia).toBeDefined();
    expect(tilapia?.salinityToleranceRangePpt).toEqual([0, 15]);
    expect(tilapia?.sourceCitation).toContain("Metwaly");
  });

  it("includes a Gracilaria profile with the Wu et al. (2018) tolerance band", () => {
    const gracilaria = getSpeciesById("gracilaria");
    expect(gracilaria).toBeDefined();
    expect(gracilaria?.salinityToleranceRangePpt).toEqual([5, 50]);
    expect(gracilaria?.category).toBe("algae");
  });

  it("includes a green mussel profile", () => {
    const mussel = getSpeciesById("green-mussel");
    expect(mussel).toBeDefined();
    expect(mussel?.scientificName).toBe("Perna viridis");
    expect(mussel?.category).toBe("mollusc");
  });

  it("includes a biofloc bacterial consortium profile", () => {
    const consortium = getSpeciesById("biofloc-consortium");
    expect(consortium).toBeDefined();
    expect(consortium?.category).toBe("bacterial-consortium");
    expect(consortium?.sourceCitation).toContain("Esquén Bayona");
  });
});
