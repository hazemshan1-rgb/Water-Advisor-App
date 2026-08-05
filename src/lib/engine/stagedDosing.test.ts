import { describe, it, expect } from "vitest";
import { stageDosing, STAGE_1_FRACTION } from "./stagedDosing";

describe("stageDosing", () => {
  it("splits a single dose into two stages with a mandatory retest gate", () => {
    const steps = stageDosing([{ compound: "Potassium chloride (KCl)", quantityKg: 100, forParameter: "K test" }]);
    expect(steps).toHaveLength(2);
    expect(steps[0].stage).toBe(1);
    expect(steps[1].stage).toBe(2);
    expect(steps[0].severity).toBe("action");
    expect(steps[1].severity).toBe("watch");
    expect(steps[1].instructions).toContain("retest");
  });

  it("never produces a negative quantity, and stage 1 is never more than the total dose", () => {
    const steps = stageDosing([{ compound: "X", quantityKg: 73.4, forParameter: "Mg test" }]);
    for (const s of steps) {
      expect(s.quantityKg).toBeGreaterThanOrEqual(0);
    }
    expect(steps[0].quantityKg).toBeLessThanOrEqual(73.4);
  });

  it("stage 1 + stage 2 sum to (approximately) the original total, within rounding", () => {
    const total = 232;
    const steps = stageDosing([{ compound: "X", quantityKg: total, forParameter: "K test" }]);
    const sum = steps[0].quantityKg + steps[1].quantityKg;
    expect(sum).toBeCloseTo(total, 0);
  });

  it("stage 1 is roughly STAGE_1_FRACTION of the total, not the whole amount", () => {
    const total = 1000;
    const steps = stageDosing([{ compound: "X", quantityKg: total, forParameter: "K test" }]);
    expect(steps[0].quantityKg).toBeCloseTo(total * STAGE_1_FRACTION, 0);
  });

  it("drops doses with zero or negative quantity rather than emitting empty stages", () => {
    const steps = stageDosing([{ compound: "X", quantityKg: 0, forParameter: "K test" }]);
    expect(steps).toEqual([]);
  });

  it("discloses gap-band fallback status in stage 1's instructions when flagged", () => {
    const steps = stageDosing([{ compound: "X", quantityKg: 50, forParameter: "K test", isGapBandFallback: true }]);
    expect(steps[0].instructions).toContain("5-10 ppt");
    expect(steps[0].instructions).not.toBe(steps[1].instructions);
  });

  it("does not mention the gap-band caveat when the dose is not a fallback", () => {
    const steps = stageDosing([{ compound: "X", quantityKg: 50, forParameter: "K test", isGapBandFallback: false }]);
    expect(steps[0].instructions).not.toContain("5-10 ppt");
  });

  it("flags stage 1 as critical and discloses the current=0 assumption when assumedZeroCurrent is set", () => {
    // Found during field-testing, 2026-08-05: an untested mineral silently
    // defaulted to current=0, producing a large, confident-looking dose
    // with no inline warning that the number rests on an assumption.
    const steps = stageDosing([
      { compound: "X", quantityKg: 5000, forParameter: "K test", assumedZeroCurrent: true },
    ]);
    expect(steps[0].severity).toBe("critical");
    expect(steps[0].instructions).toContain("never tested");
    expect(steps[0].instructions).toContain("assumes a current reading of 0");
  });

  it("does not add the untested-assumption caveat when the current reading was actually provided", () => {
    const steps = stageDosing([
      { compound: "X", quantityKg: 5000, forParameter: "K test", assumedZeroCurrent: false },
    ]);
    expect(steps[0].severity).toBe("action");
    expect(steps[0].instructions).not.toContain("never tested");
  });

  it("stages multiple doses independently, each getting its own two stages", () => {
    const steps = stageDosing([
      { compound: "KCl", quantityKg: 100, forParameter: "K test" },
      { compound: "Epsom", quantityKg: 200, forParameter: "Mg test" },
    ]);
    expect(steps).toHaveLength(4);
    expect(steps.filter((s) => s.compound === "KCl")).toHaveLength(2);
    expect(steps.filter((s) => s.compound === "Epsom")).toHaveLength(2);
  });
});
