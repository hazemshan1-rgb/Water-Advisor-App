// src/lib/engine/stagedDosing.ts
import type { DosingStep } from "../types";

// Not a guide- or literature-cited rate limit. A targeted search for
// published safe correction-rate figures for shrimp pond mineral dosing
// found nothing citable: "minimum concentrations of major cations required
// for physiological functions... are not known with certainty" (Global
// Seafood Alliance / Responsible Seafood Advocate). This even split with a
// mandatory retest gate is a disclosed conservative engineering default,
// modeled on the guide's own philosophy of graduated change (Ch.6 §5's PL
// salinity step-down: "don't exceed roughly 2-3 ppt drop per hour") applied
// to a different parameter — mineral dosing, not salinity acclimation —
// where the guide gives no numeric analog of its own.
export const STAGE_1_FRACTION = 0.5;

interface RawDose {
  compound: string;
  quantityKg: number;
  forParameter: string;
  isGapBandFallback?: boolean;
}

function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10;
}

export function stageDosing(doses: RawDose[]): DosingStep[] {
  const steps: DosingStep[] = [];

  for (const d of doses) {
    if (d.quantityKg <= 0) continue;

    const parameterLabel = d.forParameter.split(" ")[0];
    const gapNote = d.isGapBandFallback
      ? " Source salinity falls in the 5-10 ppt band the guide's own decision tree doesn't resolve — this target is a conservative fallback (whichever chapter's rule asks for more), not a direct citation."
      : "";

    const stage1Kg = roundKg(d.quantityKg * STAGE_1_FRACTION);
    const stage2Kg = roundKg(d.quantityKg - stage1Kg);

    steps.push({
      stage: 1,
      compound: d.compound,
      quantityKg: stage1Kg,
      forParameter: d.forParameter,
      severity: "action",
      instructions: `Apply now — roughly ${Math.round(STAGE_1_FRACTION * 100)}% of the total ${roundKg(d.quantityKg)} kg correction. Do not apply the full amount in one dose.${gapNote}`,
    });
    steps.push({
      stage: 2,
      compound: d.compound,
      quantityKg: stage2Kg,
      forParameter: d.forParameter,
      severity: "watch",
      instructions: `Do not apply until you retest ${parameterLabel} and confirm stage 1 moved the reading toward target without overshooting. If stage 1 already reached target, skip this stage.`,
    });
  }

  return steps;
}
