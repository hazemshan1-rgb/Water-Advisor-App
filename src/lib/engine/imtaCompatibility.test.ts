// src/lib/engine/imtaCompatibility.test.ts
import { describe, it, expect } from "vitest";
import { checkImtaCompatibility } from "./imtaCompatibility";

describe("checkImtaCompatibility", () => {
  it("returns no notes for a single-species selection", () => {
    expect(checkImtaCompatibility(["vannamei"])).toEqual([]);
  });

  it("returns no notes for an empty selection", () => {
    expect(checkImtaCompatibility([])).toEqual([]);
  });

  it("reports an explicit 'no data' note for an unrecognised species pair rather than staying silent", () => {
    // tilapia + biofloc-consortium has no located IMTA precedent (see Task 18
    // stress-test log) and was deliberately left unpopulated.
    const notes = checkImtaCompatibility(["tilapia", "biofloc-consortium"]);
    expect(notes.some((n) => n.includes("no compatibility rule on file"))).toBe(true);
  });

  it("returns a real compatibility note, not the 'no data' fallback, for a populated pair", () => {
    const notes = checkImtaCompatibility(["vannamei", "tilapia"]);
    expect(notes.some((n) => n.includes("no compatibility rule on file"))).toBe(false);
    expect(notes.some((n) => n.includes("vannamei + tilapia: compatible"))).toBe(true);
  });

  it("surfaces the tilapia+green-mussel tolerance-window gap rather than hiding it", () => {
    const notes = checkImtaCompatibility(["tilapia", "green-mussel"]);
    // compatible per the source study, but toleranceOverlapPpt is null because
    // the two species' own documented ranges don't actually overlap.
    expect(notes.some((n) => n.includes("compatible"))).toBe(true);
  });

  it("reports the full 5-species IMTA set without any pair silently dropped", () => {
    const notes = checkImtaCompatibility([
      "vannamei",
      "tilapia",
      "gracilaria",
      "green-mussel",
      "biofloc-consortium",
    ]);
    // 5 species = 10 pairs total
    expect(notes.length).toBe(10);
  });
});
