import { describe, it, expect } from "vitest";
import { buildSalinityDose } from "./saltBuilder";

describe("buildSalinityDose", () => {
  it("returns null when target is at or below current salinity -- not this chapter's scope", () => {
    expect(buildSalinityDose(15, 15, 10_000)).toBeNull();
    expect(buildSalinityDose(15, 10, 10_000)).toBeNull();
  });

  it("returns null for zero or negative volume", () => {
    expect(buildSalinityDose(0, 5, 0)).toBeNull();
  });

  it("recommends LCSM by default (open pond) with the correct NaCl quantity", () => {
    // 10,000 m3, raising 5 ppt: NaCl = 7.7 * (10,000,000L/10,000L) * 5 = 7.7 * 1000 * 5 = 38,500 kg
    const plan = buildSalinityDose(0, 5, 10_000);
    expect(plan?.recommendedSource).toBe("lcsm");
    const nacl = plan?.steps.find((s) => s.compound.includes("Sodium chloride"));
    expect(nacl?.quantity).toBeCloseTo(38_500, 0);
  });

  it("recommends sea salt for a closed system, with roughly the same total mass as the guide's own 1 kg/m3/ppt reference", () => {
    // 10,000 m3 raised by 5 ppt with pure sea salt: 1.0 * 10,000 * 5 = 50,000 kg
    const plan = buildSalinityDose(0, 5, 10_000, "closed-system");
    expect(plan?.recommendedSource).toBe("sea-salt");
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0].quantity).toBeCloseTo(50_000, 0);
  });

  it("includes the reasoned (not cited) caveat in the closed-system recommendation text", () => {
    const plan = buildSalinityDose(0, 5, 10_000, "closed-system");
    expect(plan?.recommendationReason).toContain("reasoned caution, not a tested finding");
  });

  it("returns all six LCSM compounds, none negative", () => {
    const plan = buildSalinityDose(2, 15, 5_000);
    expect(plan?.steps).toHaveLength(6);
    for (const s of plan?.steps ?? []) {
      expect(s.quantity).toBeGreaterThanOrEqual(0);
    }
  });

  it("computes pptToRaise as the simple difference between target and current", () => {
    const plan = buildSalinityDose(2, 15, 5_000);
    expect(plan?.pptToRaise).toBe(13);
  });

  it("defaults to open-pond (LCSM) when systemType is not provided", () => {
    const plan = buildSalinityDose(0, 5, 10_000);
    expect(plan?.recommendedSource).toBe("lcsm");
  });
});
