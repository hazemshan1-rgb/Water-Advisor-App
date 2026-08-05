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
  {
    id: "tilapia",
    scientificName: "Oreochromis niloticus",
    commonName: "Nile tilapia",
    category: "fish",
    // Functions as an omnivorous detritus/biofloc consumer in shrimp IMTA
    // systems rather than a primary crop — closest fit among the four
    // available TrophicRole values.
    trophicRole: "decomposer",
    // Metwaly et al. (2025): 100% survival + optimal growth at 0-10 ppt;
    // growth significantly impaired from 15 ppt up (16.67% mortality);
    // 33.33% mortality by 20 ppt. Range reflects the survivable-with-good-
    // performance band, not the outer survival limit.
    salinityToleranceRangePpt: [0, 15],
    idealIonicRatios: {},
    sensitivityThresholds: {},
    lifeStageNotes:
      "The only located multi-species IMTA precedent pairing tilapia with a bivalve and seaweed (Elle et al. 2024) ran at 25 ppt using O. mossambicus, not O. niloticus — O. mossambicus is independently documented as substantially more salt-tolerant. Straight Nile tilapia has no verified survival data at 25 ppt; red hybrid strains (which carry O. mossambicus ancestry) are the better-supported choice above ~15 ppt. See the Task 18 stress-test log for the full divergence note.",
    sourceCitation:
      "Metwaly, Nasr, Ahmed & Fathi (2025), Fish Physiology and Biochemistry 51(1):48, doi:10.1007/s10695-025-01462-6 (salinity tolerance); Hernández-Barraza, Loredo, Adame & Fitzsimmons (2012), Lat. Am. J. Aquat. Res. 40(4):936-942 (IMTA precedent w/ L. vannamei, O. niloticus, 10 ppt)",
  },
  {
    id: "gracilaria",
    scientificName: "Gracilaria spp.",
    commonName: "Gracilaria (red algae)",
    category: "algae",
    trophicRole: "extractive-algae",
    // Wu et al. (2018): G. chorda and G. vermiculophylla both euryhaline
    // across the full 5-50 psu tested range, growth peaking at 20 psu.
    salinityToleranceRangePpt: [5, 50],
    idealIonicRatios: {},
    sensitivityThresholds: {},
    lifeStageNotes:
      "Growth rate peaks around 20 psu (Wu et al. 2018). In shrimp co-culture, Gracilariopsis bailiniae removed enough nitrogenous waste to cut a 4-species system's TSS by roughly two-thirds vs monoculture control (Elle et al. 2024, 25 ppt). A separate, lower-confidence source (Raposo et al. 2013, secondary summary only) reports 93-97% nitrite/nitrate removal for G. birdiae at 38.9 psu — outside this app's vannamei operating envelope, so treat as an upper-bound data point, not a working target.",
    sourceCitation:
      "Wu, Shin, Jang, Yarish & Kim (2018), Algae 33(4):329-340 (tolerance range); Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86 (IMTA precedent w/ L. vannamei, Gracilariopsis bailiniae, 25 ppt); Raposo et al. (2013) via secondary summary (G. birdiae, 38.9 psu, not independently verified — see stress-test log)",
  },
  {
    id: "green-mussel",
    scientificName: "Perna viridis",
    commonName: "Green mussel",
    category: "mollusc",
    trophicRole: "extractive-filter",
    // General habitat range from aggregated secondary sources (primary
    // papers returned 403 on fetch — see stress-test log); narrower 23-33
    // psu band directly verified by Ma et al. (2022) with no significant
    // salinity-alone survival effect within that band.
    salinityToleranceRangePpt: [16, 33],
    idealIonicRatios: {},
    sensitivityThresholds: {},
    lifeStageNotes:
      "Optimal temperature-salinity combination ≈23.7°C/30.76 psu (Ma et al. 2022). Directly co-cultured with L. vannamei at 25 ppt alongside seaweed and tilapia with no reported conflicts (Elle et al. 2024).",
    sourceCitation:
      "General tolerance range from aggregated secondary sources, not independently fetch-verified (see stress-test log); Ma, Fu, Yang & Yu (2022), Antioxidants 11(10):2009 (23-33 psu survival band); Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86 (IMTA precedent w/ L. vannamei, 25 ppt)",
  },
  {
    id: "biofloc-consortium",
    scientificName: "Bacillus spp. (documented: B. megaterium, B. paralicheniformis)",
    commonName: "Biofloc bacterial consortium",
    category: "bacterial-consortium",
    trophicRole: "decomposer",
    // Verified operating point is 4 ppt (Esquén Bayona et al. 2026). The
    // wider [0, 35] range is a directional, provisionally-sourced claim
    // about genus-level euryhalinity — not precision-tested across that
    // span. See stress-test log.
    salinityToleranceRangePpt: [0, 35],
    idealIonicRatios: {},
    sensitivityThresholds: {},
    lifeStageNotes:
      "Native B. megaterium + B. paralicheniformis bioaugmentation in 4 ppt L. vannamei culture water stabilised nitrite and nitrate at 0 mg/L from day 4 through day 15-16, vs up to 5 mg/L nitrite / 160 mg/L nitrate in the water-exchange-only control (Esquén Bayona et al. 2026). Broader salinity range beyond this 4 ppt operating point is a genus-level literature claim, not independently precision-verified — treat any number outside 4 ppt as approximate.",
    sourceCitation:
      "Esquén Bayona et al. (2026), PLoS ONE 21(1):e0339620, doi:10.1371/journal.pone.0339620 (4 ppt operating point, verified); broader euryhalinity claim per aggregated probiotics literature — not independently fetch-verified (see stress-test log)",
  },
];

export function getSpeciesById(id: string): SpeciesProfile | undefined {
  return SPECIES.find((s) => s.id === id);
}
