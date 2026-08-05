// src/lib/data/sourceNorms.ts
//
// Source: Chapter 2 — Borewell Water Characterisation, Sections 3 and 4.
// ~/Desktop/water management guide/Chapter-2-Borewell-Water-Characterisation-SOP.md

export interface SalinityClassification {
  band:
    | "hypersaline"
    | "standard-10-25"
    | "ultra-low-1-5"
    | "zero-salinity-edge"
    | "unclassified-gap";
  routeToChapter: string;
  note: string;
}

/**
 * Ch.2 §4 decision tree. The tree's "No" branch after the 1-5 ppt check only
 * resolves the <1 ppt case explicitly — 5-10 ppt has no terminal node in the
 * source document, so it's reported as a gap rather than assigned a chapter
 * the guide doesn't actually route it to.
 */
export function classifySourceBySalinity(salinityPpt: number): SalinityClassification {
  if (salinityPpt >= 30) {
    return {
      band: "hypersaline",
      routeToChapter: "Ch.10 (MENA/GCC Saline Groundwater)",
      note: "Naturally saline/hypersaline source. Problem is dilution and ratio correction, not fortification — do not add salt.",
    };
  }
  if (salinityPpt >= 10) {
    return {
      band: "standard-10-25",
      routeToChapter: "Ch.3 (Standard Synthetic Seawater Build)",
      note:
        salinityPpt >= 20
          ? "In the 20-30 ppt range common in Gulf/MENA aquifers — check Ch.10 first, ratio correction may matter more than addition volume."
          : "Standard 10-25 ppt synthetic seawater build applies.",
    };
  }
  if (salinityPpt >= 1 && salinityPpt < 5) {
    return {
      band: "ultra-low-1-5",
      routeToChapter: "Ch.6 (Ultra-Low & Zero-Salinity Systems)",
      note: "Check absolute K+/Mg2+/Cl- floors, not ratio dilution alone.",
    };
  }
  if (salinityPpt < 1) {
    return {
      band: "zero-salinity-edge",
      routeToChapter: "senior review required",
      note: "Zero-salinity edge case. Requires full ionic reconstruction; near-total synthetic build, highest mineral cost/ton.",
    };
  }
  return {
    band: "unclassified-gap",
    routeToChapter: "none — gap in Ch.2 §4 decision tree",
    note: "5-10 ppt has no explicit terminal node in the source guide's decision tree. Treat with the same rigor as the nearest documented band (Ch.3 or Ch.6) until this gap is resolved in the guide itself.",
  };
}

// Ch.2 §3 Red-Flag Threshold Table — only rows that map onto fields present
// in WaterParameters (Fe/Mn/H2S/arsenic are out of scope, see plan's Global Constraints).
export const RED_FLAG_THRESHOLDS = {
  hardnessToAlkalinityWatchRatio: 2,
  hardnessToAlkalinityActionRatio: 3,
  potassiumWatchMgL: 5,
  potassiumActionMgL: 2,
  magnesiumFloorAtStandardSalinityMgL: 10, // at >=10 ppt target
  magnesiumFloorAtLowSalinityMgL: 3, // at 1-5 ppt target
  chlorideWatchMgLAtLowSalinity: 300, // salinity < 5 ppt
  chlorideActionMgLAtLowSalinity: 150,
} as const;
