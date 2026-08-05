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
    const notes = checkImtaCompatibility(["vannamei", "tilapia"]);
    expect(notes.some((n) => n.includes("no compatibility rule on file"))).toBe(true);
  });
});
