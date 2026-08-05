//
// Source: Chapter 3 Part 4 — "What to Add, and How Much"
// ~/Desktop/water management guide/Chapter-3-Standard-Synthetic-Seawater-Build-SOP.md

import type { DosingRecipe, WaterParameters } from "../types";

const KCL_POTASSIUM_FRACTION = 0.5; // KCl (muriate of potash) is ~50% potassium by weight

/**
 * mg/L shortfall -> kg for a given volume in m3.
 * 1 mg/L across a 1-hectare pond at 1m depth (10,000 m3 = 10,000,000 L) is
 * ~10 kg (Ch.3 Part 4). Per m3 that's 1 mg/L * 1000 L = 1000 mg = 0.001 kg,
 * i.e. multiply mg/L by volumeM3 and divide by 1000.
 */
function mgPerLShortfallToKg(shortfallMgL: number, volumeM3: number): number {
  return Math.max(0, shortfallMgL) * volumeM3 * 0.001;
}

export function calculatePotassiumDose(
  params: WaterParameters,
  volumeM3: number,
  targetMgL: number
): { compound: string; quantityKg: number }[] {
  const currentK = params.potassiumMgL ?? 0;
  const shortfall = targetMgL - currentK;
  const kclNeededMgL = Math.max(0, shortfall) / KCL_POTASSIUM_FRACTION;
  const quantityKg = mgPerLShortfallToKg(kclNeededMgL, volumeM3);

  return [{ compound: "Potassium chloride (KCl)", quantityKg: Math.round(quantityKg * 10) / 10 }];
}

export const DOSING_RECIPES: DosingRecipe[] = [
  {
    id: "kcl-potassium-correction",
    targetRatio: "K (absolute mg/L)",
    amendmentCompound: "Potassium chloride (KCl)",
    formula:
      "shortfall_mgL = target_mgL - current_mgL; KCl_mgL = shortfall_mgL / 0.50; quantity_kg = KCl_mgL * volume_m3 / 1000",
    calculate: (params, volumeM3) => calculatePotassiumDose(params, volumeM3, 163),
  },
];
