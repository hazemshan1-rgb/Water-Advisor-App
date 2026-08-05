// src/lib/data/imtaRules.ts
//
// Populated in Task 18. Every rule below is sourced in
// docs/superpowers/plans/2026-08-05-imta-species-stress-test-log.md.
// Pairs with no located precedent (tilapia+biofloc-consortium,
// gracilaria+biofloc-consortium, green-mussel+biofloc-consortium) are
// deliberately omitted rather than guessed — checkImtaCompatibility's
// existing "no compatibility rule on file" fallback handles those honestly.
import type { ImtaCompatibilityRule } from "../types";

export const IMTA_RULES: ImtaCompatibilityRule[] = [
  {
    speciesIdA: "vannamei",
    speciesIdB: "tilapia",
    compatible: true,
    // vannamei [1,30] ∩ tilapia [0,15]
    toleranceOverlapPpt: [1, 15],
    stockingRatioGuidance:
      "Hernández-Barraza et al. (2012): sequential polyculture at 10 ppt with O. niloticus; highest tilapia-density treatment improved shrimp average weight (6.08±0.18g vs 5.14±0.59g monoculture) and FCR, no negative interaction.",
    knownConflicts:
      "Elle et al. (2024) also ran this pairing successfully at 25 ppt, but used O. mossambicus, not O. niloticus — O. mossambicus is documented elsewhere as substantially more salt-tolerant. Do not assume straight Nile tilapia performs the same at 25 ppt; red hybrid strains are the better-supported choice above ~15 ppt.",
    sourceCitation:
      "Hernández-Barraza, Loredo, Adame & Fitzsimmons (2012), Lat. Am. J. Aquat. Res. 40(4):936-942; Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86",
  },
  {
    speciesIdA: "vannamei",
    speciesIdB: "gracilaria",
    compatible: true,
    // vannamei [1,30] ∩ gracilaria [5,50]
    toleranceOverlapPpt: [5, 30],
    stockingRatioGuidance:
      "Elle et al. (2024): 2 kg/m² Gracilariopsis bailiniae alongside 400 shrimp/m³ at 25 ppt cut TSS from 1107±81 mg/L (control) to 351-395 mg/L, with shrimp survival 65-70% vs 42% control and weight 16.10-17.50g vs 11.42g control in a multi-species system.",
    knownConflicts:
      "Raposo et al. (2013, secondary source only) reports G. birdiae removing 93% NO2-/97% NO3- at 38.9 psu — well above vannamei's typical operating envelope per this app's own scope. Treat as an upper-bound data point, not a working target.",
    sourceCitation:
      "Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86; Raposo et al. (2013) via secondary summary",
  },
  {
    speciesIdA: "vannamei",
    speciesIdB: "green-mussel",
    compatible: true,
    // vannamei [1,30] ∩ green-mussel [16,33]
    toleranceOverlapPpt: [16, 30],
    stockingRatioGuidance:
      "Elle et al. (2024): 50 Perna viridis/m line alongside 400 shrimp/m³ at 25 ppt, no negative interaction, contributed to the same system's TSS reduction alongside seaweed and tilapia.",
    sourceCitation:
      "Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86",
  },
  {
    speciesIdA: "vannamei",
    speciesIdB: "biofloc-consortium",
    compatible: true,
    // vannamei [1,30] ∩ biofloc-consortium [0,35]
    toleranceOverlapPpt: [1, 30],
    stockingRatioGuidance:
      "Esquén Bayona et al. (2026): native B. megaterium + B. paralicheniformis bioaugmentation in 4 ppt L. vannamei culture water stabilised nitrite/nitrate at 0 mg/L from day 4 through day 15-16, vs up to 5 mg/L nitrite / 160 mg/L nitrate in the water-exchange-only control.",
    sourceCitation:
      "Esquén Bayona et al. (2026), PLoS ONE 21(1):e0339620, doi:10.1371/journal.pone.0339620",
  },
  {
    speciesIdA: "tilapia",
    speciesIdB: "gracilaria",
    compatible: true,
    // tilapia [0,15] ∩ gracilaria [5,50]
    toleranceOverlapPpt: [5, 15],
    knownConflicts:
      "Only documented jointly in Elle et al. (2024)'s 4-species system at 25 ppt, using O. mossambicus rather than O. niloticus. No dedicated pairwise tilapia+seaweed trial located.",
    sourceCitation:
      "Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86",
  },
  {
    speciesIdA: "tilapia",
    speciesIdB: "green-mussel",
    compatible: true,
    // tilapia [0,15] and green-mussel [16,33] do not actually overlap — see
    // the divergence note in the stress-test log. The source paper ran this
    // pairing successfully, but under O. mossambicus (more salt-tolerant),
    // not the O. niloticus profile modeled here.
    toleranceOverlapPpt: null,
    knownConflicts:
      "Elle et al. (2024) ran this pairing successfully at 25 ppt, but with O. mossambicus, whose salinity tolerance is documented elsewhere as notably higher than O. niloticus. Straight Nile tilapia has no independently verified survival data in the 16-33 ppt band this mussel needs — the two profiles' own documented tolerance windows do not overlap. Red hybrid tilapia is the better-supported choice for this specific pairing.",
    sourceCitation:
      "Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86",
  },
  {
    speciesIdA: "gracilaria",
    speciesIdB: "green-mussel",
    compatible: true,
    // gracilaria [5,50] ∩ green-mussel [16,33]
    toleranceOverlapPpt: [16, 33],
    stockingRatioGuidance:
      "Co-occurred without conflict in Elle et al. (2024)'s 4-species system at 25 ppt (2 kg/m² Gracilariopsis bailiniae + 50 Perna viridis/m line).",
    sourceCitation:
      "Elle, Apines-Amar, Janeo & Genodepa (2024), Isr. J. Aquac.-Bamidgeh 76(4):75-86",
  },
];
