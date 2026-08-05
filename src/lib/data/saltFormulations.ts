// src/lib/data/saltFormulations.ts
//
// Source: Chapter 16 -- Salt Selection: Reconstituted Sea Salt vs. Low-Cost
// Mineral Blends. Confirmed independently from two primary sources:
// Galkanda-Arachchige, Roy, Kelly & Davis (2022), Responsible Seafood
// Advocate (Auburn University research), and a separate Alabama Cooperative
// Extension System writeup of the same underlying study. Both state the
// identical table below as "per 10,000 L, to raise salinity by 1 ppt."
//
// An earlier AI-generated research pass on this exact question relabeled
// this same table as "per 1 m3 at 15 ppt" (wrong on both volume and
// salinity, compounding to a ~15x error) and separately produced a sea-salt
// dosing formula low by a factor of ~28x. Both were caught by fetching the
// primary sources directly -- see the guide's Stress-Test log, 2026-08-05,
// "Chapter 16 Research" section, "Claims Rejected" table.

export interface LcsmComponent {
  compound: string;
  quantityPer10000LPer1Ppt: number;
  unit: "kg" | "L";
}

export const LCSM_FORMULA: LcsmComponent[] = [
  { compound: "Sodium chloride (NaCl)", quantityPer10000LPer1Ppt: 7.7, unit: "kg" },
  { compound: "Magnesium chloride (MgCl2)", quantityPer10000LPer1Ppt: 1.0, unit: "kg" },
  { compound: "Magnesium sulfate (MgSO4)", quantityPer10000LPer1Ppt: 1.2, unit: "kg" },
  { compound: "Muriate of potash (KCl)", quantityPer10000LPer1Ppt: 0.2138, unit: "kg" },
  { compound: "Calcium chloride (CaCl2)", quantityPer10000LPer1Ppt: 0.7, unit: "L" },
  { compound: "Sodium bicarbonate (NaHCO3)", quantityPer10000LPer1Ppt: 0.0606, unit: "kg" },
];

// Ch.16 SS2: seawater at 35 ppt carries ~35 kg of dissolved solids per m3 --
// basic seawater salinity definition, not an independent literature claim --
// i.e. ~1 kg/m3 of total material per ppt for pure reconstituted sea salt.
export const PURE_SEA_SALT_KG_PER_M3_PER_PPT = 1.0;
