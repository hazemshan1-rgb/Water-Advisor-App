import { describe, it, expect } from "vitest";
import { calculatePotassiumDose } from "./dosingRecipes";
import type { WaterParameters } from "../types";

describe("calculatePotassiumDose", () => {
  it("reproduces the guide's worked KCl example exactly (Ch.3 Part 4)", () => {
    // Source: K+ 8 mg/L, target 163 mg/L at 15 ppt -> shortfall 155 mg/L ->
    // 310 mg/L KCl (at ~50% K fraction) -> 3,100 kg over a 1 ha x 1 m pond
    // (10,000 m3).
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 };
    const result = calculatePotassiumDose(params, 10_000, 163);

    expect(result).toHaveLength(1);
    expect(result[0].compound).toBe("Potassium chloride (KCl)");
    expect(result[0].quantityKg).toBeCloseTo(3100, 0);
  });

  it("returns zero quantity when the source already meets the target", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, potassiumMgL: 200 };
    const result = calculatePotassiumDose(params, 10_000, 163);
    expect(result[0].quantityKg).toBe(0);
  });

  it("treats missing source potassium data as zero potassium present", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = calculatePotassiumDose(params, 1000, 163);
    // shortfall 163 mg/L / 0.50 = 326 mg/L KCl; over 1000 m3: 326 * 1000 / 1000 = 326 kg
    expect(result[0].quantityKg).toBeCloseTo(326, 0);
  });
});
