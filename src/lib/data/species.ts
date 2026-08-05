import type { SpeciesProfile } from "../types";

export const SPECIES: SpeciesProfile[] = [
  {
    id: "vannamei",
    scientificName: "Litopenaeus vannamei",
    commonName: "Whiteleg shrimp",
    category: "crustacean",
    trophicRole: "primary",
    // Synthesised from the guide's own stated operational scope: Ch.6 covers
    // 1-5 ppt ("ultra-low"), Ch.3 covers 10-25 ppt ("standard"), Ch.2 §4
    // routes >=30 ppt to Ch.10 (hypersaline). This is the guide's documented
    // operating envelope, not an independent literature claim.
    salinityToleranceRangePpt: [1, 30],
    idealIonicRatios: {
      // Ch.3 Part 2: Na:Mg:Ca:K = 27:3:1:1 (calcium = 1 baseline)
      "Na:K": 27,
      "Mg:Ca": 3,
      "Na:Ca": 27,
    },
    sensitivityThresholds: {
      // TAN and pH ranges are deliberately left unset: no specific target
      // range for either was located in the guide chapters reviewed while
      // building this profile (Ch.2, Ch.3, Ch.4, Ch.6, Ch.7). Populate once
      // sourced rather than guessing — see plan's citation-discipline
      // constraint.
    },
    lifeStageNotes:
      "PL acclimation (25-30 ppt hatchery to 1-5 ppt pond) must follow the Ch.6 §5 step-down schedule; direct transfer is a common, avoidable failure point.",
    sourceCitation:
      "Water Management Guide Ch.2 §4, Ch.3 Part 2 and Part 3, Ch.6 §1-2 and §5",
  },
];

export function getSpeciesById(id: string): SpeciesProfile | undefined {
  return SPECIES.find((s) => s.id === id);
}
