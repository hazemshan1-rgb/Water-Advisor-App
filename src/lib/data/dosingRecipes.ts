// src/lib/data/dosingRecipes.ts
//
// Source: Chapter 3 Part 2 (full-strength ion reference table, Cotruvo
// 2005 column), Part 3 (proportional dilution maths, >=10 ppt band), Part 4
// ("What to Add, and How Much" -- product %-by-weight fractions), and Part 5
// (potassium extended-interval target). Chapter 6 Section 2 (absolute
// mineral floor table, 1-5 ppt band). Chapter 8 Part 2 (resolves the
// potassium divergence -- confirms 20-75 mg/L, not the higher biofloc
// figures, "has not been superseded").
// ~/Desktop/water management guide/Chapter-3-Standard-Synthetic-Seawater-Build-SOP.md
// ~/Desktop/water management guide/Chapter-6-Ultra-Low-Zero-Salinity-Protocol-SOP.md
//
// Two salinity-dependent target strategies, matching how the guide itself
// splits this problem: >=10 ppt uses Ch.3's proportional scaling off the
// 35 ppt full-strength reference; 1-<5 ppt uses Ch.6's fixed absolute
// floors instead (proportional scaling stops being valid that low, per
// Ch.6 Section 1). The 5-<10 ppt gap and <1 ppt zero-salinity edge case,
// and >=30 ppt hypersaline sources (a dilution problem per Ch.2 Section 4,
// not a fortification one), have no defined target in either chapter --
// these functions return null rather than guessing, the same honesty
// principle `classifySourceBySalinity` in sourceNorms.ts already applies.
//
// Only potassium and magnesium are built out here: they're the two ions
// with both a cited target (worked example or floor table) AND a cited
// %-by-weight correction product. Calcium's correction product (calcium
// chloride) has no cited %-by-weight figure in Ch.3 Part 4, and the guide
// explicitly frames calcium correction as "rarely needed... confirm with
// a test before adding" rather than an auto-dosed default. Sodium and
// chloride have no independent correction product in the guide's Part 4
// table at all.

import type { DosingRecipe, WaterParameters } from "../types";

export const ION_FULL_STRENGTH_35PPT_MGL = {
  magnesium: 1_262,
  potassium: 380,
} as const;

// Ch.6 Section 2's own Absolute Mineral Floor Table gives THREE potassium
// tiers -- documented failure <10, adequate range 20-30, extended-interval
// target 50-75 -- and says explicitly: "these are floors and general
// targets, not a ceiling to chase. Operate comfortably above the failure
// point, not at the edge." Dosing to the bare 20 mg/L "adequate" floor
// means zero margin; 50 mg/L is both the table's own extended-interval
// figure AND the literal number the guide's cited real-world mortality
// case (Boyd et al., Alabama/Ecuador) was corrected to when it resolved.
//
// Magnesium: Ch.6 §2 gives only "documented failure point <3 mg/L (source
// screen, Ch.2)" and "adequate ≥15 mg/L in pond" -- no extended-interval
// figure, unlike potassium. A real 2023 production-pond field trial
// (Hernández, Abdelrahman, Galkanda-Arachchige, Kelly, Butts, Davis, Beck &
// Roy, Auburn -- 23-week commercial-pond trial, not a lab tank) found the
// 12.8 mg/L control showed a statistically significant growth deficit past
// 22g body weight, and states plainly that even the improved 28 mg/L
// treatment was still "suboptimal... lower than 50% of what Mg2+ should be"
// at that salinity. 28 mg/L is used here as the new floor: it's the real,
// production-validated, better-than-control figure directly confirmed in
// that trial -- not a guess at the true optimum, which the source itself
// says is higher still. This is flagged in Chapter 6's own gap (no
// extended-interval Mg figure) rather than presented as if the guide had
// already resolved it.
const LOW_SALINITY_FLOOR_MGL = {
  potassium: 50,
  magnesium: 28,
} as const;

const KCL_POTASSIUM_FRACTION = 0.5; // KCl (muriate of potash) is ~50% potassium, Ch.3 Part 4
const EPSOM_MAGNESIUM_FRACTION = 0.099; // Magnesium sulfate heptahydrate is ~9.9% magnesium, Ch.3 Part 4

/**
 * Ch.3 Part 3: target = full-strength value * (targetSalinityPpt / 35).
 * The guide states this is only valid for the standard 10-<30 ppt band.
 * Exposed without that floor so the 5-<10 ppt gap-band fallback below can
 * reuse the same proportional maths at the source's actual salinity --
 * but see the `allowProportionalInGapBand` note below for why this isn't
 * applied uniformly to every ion in that band.
 */
function calculateProportionalTarget(fullStrengthMgL: number, salinityPpt: number): number {
  return fullStrengthMgL * (salinityPpt / 35);
}

export interface ResolvedTarget {
  targetMgL: number;
  // true only for the 5-<10 ppt band the guide's own decision tree never
  // resolves (Ch.2 §4). Not a guide-sourced number -- see the comment below.
  isGapBandFallback: boolean;
}

/**
 * Resolves a target for the given ion across both salinity strategies:
 * proportional scaling at >=10-<30 ppt (Ch.3), absolute floor at 1-<5 ppt
 * (Ch.6 Section 2). Returns null for the <1 ppt zero-edge case and >=30 ppt
 * hypersaline sources -- neither has a defined target in the source
 * material for this kind of fortification dosing, and guessing one would
 * be exactly the "invented number" failure mode this app is built to avoid.
 *
 * The 5-<10 ppt gap is different: it's genuinely unresolved in the guide's
 * own decision tree, but returning nothing here means a real farm in that
 * band gets no dosing guidance at all, which is worse than a disclosed
 * conservative estimate.
 *
 * `allowProportionalInGapBand` controls HOW that fallback behaves, and it's
 * ion-specific for a real reason found during field-testing: for potassium,
 * Ch.3's proportional formula and Ch.6's floor land in the same order of
 * magnitude across the gap band (max() picks a sensible number, and Ch.6 §2
 * has a real extended-interval figure to sanity-check it against). For
 * magnesium, proportional scaling toward full-strength seawater's much
 * higher 1,262 mg/L reference produces targets that balloon disproportionately
 * (252 mg/L at 7 ppt) -- and Ch.6 §1 already warns that proportional
 * ratio-matching "breaks down" at the low end, with no extended-interval Mg
 * figure in Ch.6 §2 to validate a large number against. So magnesium's
 * gap-band fallback uses the floor directly instead of extrapolating a
 * formula the guide itself says is unreliable at this salinity.
 */
function resolveTargetMgL(
  fullStrengthMgL: number,
  lowSalinityFloorMgL: number,
  salinityPpt: number,
  allowProportionalInGapBand: boolean
): ResolvedTarget | null {
  if (salinityPpt >= 10 && salinityPpt < 30) {
    return { targetMgL: calculateProportionalTarget(fullStrengthMgL, salinityPpt), isGapBandFallback: false };
  }
  if (salinityPpt >= 1 && salinityPpt < 5) {
    return { targetMgL: lowSalinityFloorMgL, isGapBandFallback: false };
  }
  if (salinityPpt >= 5 && salinityPpt < 10) {
    if (!allowProportionalInGapBand) {
      return { targetMgL: lowSalinityFloorMgL, isGapBandFallback: true };
    }
    const proportional = calculateProportionalTarget(fullStrengthMgL, salinityPpt);
    return { targetMgL: Math.max(proportional, lowSalinityFloorMgL), isGapBandFallback: true };
  }
  return null;
}

/**
 * mg/L shortfall -> kg for a given volume in m3.
 * 1 mg/L across a 1-hectare pond at 1m depth (10,000 m3 = 10,000,000 L) is
 * ~10 kg (Ch.3 Part 4). Per m3 that's 1 mg/L * 1000 L = 1000 mg = 0.001 kg,
 * i.e. multiply mg/L by volumeM3 and divide by 1000.
 */
function mgPerLShortfallToKg(shortfallMgL: number, volumeM3: number): number {
  return Math.max(0, shortfallMgL) * volumeM3 * 0.001;
}

function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10;
}

export function calculatePotassiumDose(
  params: WaterParameters,
  volumeM3: number,
  targetMgL: number,
  isGapBandFallback = false
): { compound: string; quantityKg: number; isGapBandFallback?: boolean; assumedZeroCurrent?: boolean }[] {
  const currentKProvided = params.potassiumMgL !== undefined;
  const currentK = params.potassiumMgL ?? 0;
  const shortfall = targetMgL - currentK;
  const kclNeededMgL = Math.max(0, shortfall) / KCL_POTASSIUM_FRACTION;
  const quantityKg = mgPerLShortfallToKg(kclNeededMgL, volumeM3);

  return [
    {
      compound: "Potassium chloride (KCl)",
      quantityKg: roundKg(quantityKg),
      isGapBandFallback,
      assumedZeroCurrent: !currentKProvided,
    },
  ];
}

export function calculateMagnesiumDose(
  params: WaterParameters,
  volumeM3: number,
  targetMgL: number,
  isGapBandFallback = false
): { compound: string; quantityKg: number; isGapBandFallback?: boolean; assumedZeroCurrent?: boolean }[] {
  const currentMgProvided = params.magnesiumMgL !== undefined;
  const currentMg = params.magnesiumMgL ?? 0;
  const shortfall = targetMgL - currentMg;
  const epsomNeededMgL = Math.max(0, shortfall) / EPSOM_MAGNESIUM_FRACTION;
  const quantityKg = mgPerLShortfallToKg(epsomNeededMgL, volumeM3);

  return [
    {
      compound: "Magnesium sulfate heptahydrate (Epsom salt)",
      quantityKg: roundKg(quantityKg),
      isGapBandFallback,
      assumedZeroCurrent: !currentMgProvided,
    },
  ];
}

export const DOSING_RECIPES: DosingRecipe[] = [
  {
    id: "kcl-potassium-correction",
    targetRatio: "K (Ch.3 proportional scaling >=10-<30 ppt, or Ch.6 extended-interval target 1-<5 ppt)",
    amendmentCompound: "Potassium chloride (KCl)",
    formula:
      "target_mgL = resolveTargetMgL(380, 50, salinityPpt); shortfall_mgL = target_mgL - current_mgL; KCl_mgL = shortfall_mgL / 0.50; quantity_kg = KCl_mgL * volume_m3 / 1000",
    calculate: (params, volumeM3) => {
      const resolved = resolveTargetMgL(ION_FULL_STRENGTH_35PPT_MGL.potassium, LOW_SALINITY_FLOOR_MGL.potassium, params.salinityPpt, true);
      if (resolved === null) return [];
      return calculatePotassiumDose(params, volumeM3, resolved.targetMgL, resolved.isGapBandFallback);
    },
  },
  {
    id: "epsom-magnesium-correction",
    targetRatio: "Mg (Ch.3 proportional scaling >=10-<30 ppt, or field-validated floor 1-<10 ppt)",
    amendmentCompound: "Magnesium sulfate heptahydrate (Epsom salt)",
    formula:
      "target_mgL = resolveTargetMgL(1262, 28, salinityPpt); shortfall_mgL = target_mgL - current_mgL; Epsom_mgL = shortfall_mgL / 0.099; quantity_kg = Epsom_mgL * volume_m3 / 1000",
    calculate: (params, volumeM3) => {
      const resolved = resolveTargetMgL(ION_FULL_STRENGTH_35PPT_MGL.magnesium, LOW_SALINITY_FLOOR_MGL.magnesium, params.salinityPpt, false);
      if (resolved === null) return [];
      return calculateMagnesiumDose(params, volumeM3, resolved.targetMgL, resolved.isGapBandFallback);
    },
  },
];
