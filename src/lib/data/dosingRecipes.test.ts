// src/lib/data/dosingRecipes.test.ts
import { describe, it, expect } from "vitest";
import { calculatePotassiumDose, calculateMagnesiumDose, DOSING_RECIPES } from "./dosingRecipes";
import type { WaterParameters } from "../types";

describe("calculatePotassiumDose", () => {
  it("reproduces the guide's worked KCl example exactly (Ch.3 Part 4)", () => {
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
    expect(result[0].quantityKg).toBeCloseTo(326, 0);
  });
});

describe("calculateMagnesiumDose", () => {
  it("computes Epsom salt quantity for a given shortfall and volume", () => {
    // shortfall 100 mg/L / 0.099 = ~1010.1 mg/L Epsom needed; over 5000 m3: ~5050.5 kg
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, magnesiumMgL: 50 };
    const result = calculateMagnesiumDose(params, 5000, 150);
    expect(result[0].compound).toBe("Magnesium sulfate heptahydrate (Epsom salt)");
    expect(result[0].quantityKg).toBeCloseTo(5050.5, 0);
  });

  it("returns zero quantity when the source already meets the target", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, magnesiumMgL: 600 };
    const result = calculateMagnesiumDose(params, 5000, 541);
    expect(result[0].quantityKg).toBe(0);
  });
});

describe("DOSING_RECIPES", () => {
  it("scales the potassium target proportionally at 15 ppt, matching the guide's own ~163 mg/L worked figure", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "kcl-potassium-correction")!;
    const result = recipe.calculate(params, 10_000);
    // target = 380 * (15/35) = 162.857..., shortfall = 154.857, KCl = 309.71 mg/L, qty = 3097.1 kg
    expect(result[0].quantityKg).toBeCloseTo(3097.1, 0);
  });

  it("uses the extended-interval target (50 mg/L) for potassium in the 1-5 ppt band, not proportional scaling", () => {
    // Nalgonda-style low-salinity source (Ch.6 Section 8 worked example).
    // Target raised from the bare 20 mg/L "adequate" floor to 50 mg/L (Ch.6
    // §2's own extended-interval figure, and the literal number the guide's
    // cited real-world mortality case was corrected to) -- see the
    // dosingRecipes.ts header comment for the full reasoning.
    const params: WaterParameters = { salinityPpt: 2, pH: 7.6, potassiumMgL: 8.4 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "kcl-potassium-correction")!;
    const result = recipe.calculate(params, 10_000);
    // target = 50, shortfall = 41.6, KCl = 83.2 mg/L, qty = 832 kg
    expect(result[0].quantityKg).toBeCloseTo(832, 0);
  });

  it("applies a disclosed conservative fallback for potassium in the undefined 5-<10 ppt gap band, rather than returning nothing", () => {
    // target = max(Ch.3 proportional at 7 ppt = 380*(7/35) = 76, Ch.6 floor = 20) = 76
    // shortfall = 76 - 5 = 71, KCl = 71/0.5 = 142 mg/L, qty = 142 * 10_000 / 1000 = 1420 kg
    const params: WaterParameters = { salinityPpt: 7, pH: 7.7, potassiumMgL: 5 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "kcl-potassium-correction")!;
    const result = recipe.calculate(params, 10_000);
    expect(result[0].quantityKg).toBeCloseTo(1420, 0);
    expect(result[0].isGapBandFallback).toBe(true);
  });

  it("does not flag isGapBandFallback for the standard >=10 ppt band", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "kcl-potassium-correction")!;
    const result = recipe.calculate(params, 10_000);
    expect(result[0].isGapBandFallback).toBe(false);
  });

  it("returns no dose for potassium at hypersaline salinity (>=30 ppt) -- dilution problem, not fortification", () => {
    const params: WaterParameters = { salinityPpt: 32, pH: 8.0, potassiumMgL: 50 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "kcl-potassium-correction")!;
    expect(recipe.calculate(params, 10_000)).toEqual([]);
  });

  it("scales the magnesium target the same way, proportional at standard salinity", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, magnesiumMgL: 90 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "epsom-magnesium-correction")!;
    const result = recipe.calculate(params, 10_000);
    // target = 1262 * (15/35) = 540.857, shortfall = 450.857, Epsom = 4554.1 mg/L, qty = 45541 kg
    expect(result[0].quantityKg).toBeGreaterThan(0);
    expect(result[0].compound).toBe("Magnesium sulfate heptahydrate (Epsom salt)");
  });

  it("uses the field-validated 28 mg/L floor directly for magnesium in the 5-<10 ppt gap band, NOT proportional scaling", () => {
    // Found during field-testing, 2026-08-05: proportional scaling toward
    // full-strength seawater's 1,262 mg/L reference produced a wildly
    // disproportionate target (252 mg/L at 7 ppt -> tens of thousands of kg)
    // for a parameter Ch.6 §1 already warns doesn't ratio-match reliably
    // this low. Magnesium's gap-band fallback now ignores the proportional
    // formula entirely and uses the floor.
    const params: WaterParameters = { salinityPpt: 7, pH: 7.7, magnesiumMgL: 10 };
    const recipe = DOSING_RECIPES.find((r) => r.id === "epsom-magnesium-correction")!;
    const result = recipe.calculate(params, 10_000);
    // target = 28 (floor only, not max(proportional=252.4, floor=28))
    // shortfall = 18, Epsom = 18/0.099 = 181.8 mg/L, qty = 1818.2 kg
    expect(result[0].quantityKg).toBeCloseTo(1818.2, 0);
    expect(result[0].isGapBandFallback).toBe(true);
  });
});
