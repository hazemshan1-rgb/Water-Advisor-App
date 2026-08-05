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
});
