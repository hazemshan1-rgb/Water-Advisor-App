# IMTA Co-Species Stress-Test & Literature Cross-Check Log
### Water Advisor App | Task 18 research, 2026-08-05

Mirrors the format of the Water Management Guide's own `Stress-Test-and-Literature-Cross-Check-Log.md`. Every quantitative claim added to `species.ts` and `imtaRules.ts` is logged here with what it was checked against, at what confidence, before it went into the data files.

---

## Claims Verified — Directly Fetched From Primary Source

| Claim | Source | Verdict |
|---|---|---|
| Nile tilapia (*O. niloticus*): 100% survival + optimal growth 0–10 ppt; growth significantly impaired ≥15 ppt (16.67% mortality, final weight 38.85g vs 45.02g control); 33.33% mortality at 20 ppt | Metwaly, Nasr, Ahmed & Fathi (2025), *Fish Physiology and Biochemistry* 51(1):48. doi:10.1007/s10695-025-01462-6 | Directly fetched from full text — held |
| *L. vannamei* + Nile tilapia (*O. niloticus*) sequential polyculture at 10 ppt: highest-tilapia-density treatment improved shrimp average weight (6.08±0.18g vs 5.14±0.59g monoculture) and FCR; no negative interaction reported | Hernández-Barraza, Loredo, Adame & Fitzsimmons (2012), *Latin American Journal of Aquatic Research* 40(4):936–942. doi:10.3856/vol40-issue4-fulltext-10 | Directly fetched — held |
| *Gracilaria chorda*, *G. vermiculophylla*, *Ulva prolifera*, *U. compressa* all euryhaline across 5–50 psu tested range; highest growth rates at 20 psu for all four species | Wu, Shin, Jang, Yarish & Kim (2018), *Algae* 33(4):329–340 | Directly fetched — held |
| 4-species system (*L. vannamei* 400/m³ + green mussel *Perna viridis* 50/m line + seaweed *Gracilariopsis bailiniae* 2kg/m² + Nile tilapia *O. mossambicus* 350g/m³) at 25.00–25.67 ppt: integrated treatment cut TSS from 1107±81 mg/L (control) to 351–395 mg/L; shrimp weight 16.10–17.50g vs 11.42g control; shrimp survival 65–70% vs 42% control; "all species combinations performed equally well without conflicts reported" | Elle, Apines-Amar, Janeo & Genodepa (2024), *Israeli Journal of Aquaculture – Bamidgeh* 76(4):75–86 | Directly fetched — held. **Note the tilapia species is O. mossambicus, not O. niloticus — see divergence note below.** |
| Native *Bacillus megaterium* + *B. paralicheniformis* bioaugmentation in 4 ppt *L. vannamei* culture water: nitrite/nitrate stabilised at 0 mg/L from day 4 through day 15–16, vs up to 5 mg/L nitrite / 160 mg/L nitrate in water-exchange-only control | Esquén Bayona et al. (2026), *PLoS ONE* 21(1):e0339620. doi:10.1371/journal.pone.0339620 | Directly fetched — held |
| *Perna viridis* survival tested at 23‰/28‰/33‰: salinity alone had no significant effect on survival within that band (p>0.05); optimal temperature-salinity combination ≈23.7°C/30.76‰ | Ma, Fu, Yang & Yu (2022), *Antioxidants* 11(10):2009. doi:10.3390/antiox11102009 | Directly fetched — held, but only covers the narrow 23–33‰ band, not the species' full documented range |

---

## Claims Accepted Provisionally — Secondary Source or Search-Aggregate Only

Primary source blocked (403) or paywalled; used anyway per the guide's own precedent of accepting "single strong source, no contradicting figure found — held provisionally" rather than discarding a claim with no contradicting evidence, but flagged here as lower-confidence than the directly-fetched claims above.

| Claim | Source | Why provisional |
|---|---|---|
| *Gracilaria birdiae* removed 93% NO2- / 97% NO3-; *Ulva fasciata* removed 97%/94%, in shrimp tank system at 38.9±1.81 psu | Raposo et al. (2013), presented at Aquaculture Europe 2013, Rio Grande do Norte, Brazil — accessed via The Fish Site's summary article, not the original proceedings | Secondary summary of a conference presentation, not the primary abstract/paper itself |
| *Perna viridis* general habitat/tolerance range ≈16–33 ppt, optimal 27–33 ppt | Aggregated from multiple secondary sources (iNaturalist, ScienceDirect Topics, Caribbean Invasive Species Network); primary papers (Hindawi 2016 salinity/temperature study, USGS NAS fact sheet) both returned HTTP 403 on fetch | Could not independently verify from a single primary source; used because it doesn't contradict the directly-verified 23–33‰ narrow-band data (Ma et al. 2022) and is internally consistent across independent secondary sources |
| Bacillus spp. broadly described as capable of growth "in a wide range of salinities" via compatible-solute production (proline) under osmotic stress; separately, one search-aggregate reference (Tank, Vadher & Patel) states probiotic strains including *B. subtilis* grew (at reduced rate) in 34 ppt marine broth | Sampath et al. (2025) review, *Aquaculture Research*, via Wiley; Tank, Vadher & Patel study via ResearchGate (403 on fetch, title/finding only from search snippet) | Genus-level mechanistic claim, not a specific numeric tolerance curve for the exact strains used in the verified 4 ppt trial (Esquén Bayona et al. 2026). The [0, 35] ppt range applied to the biofloc-consortium profile is directional, not precision-tested — treat any number outside the verified 4 ppt operating point as approximate |

---

## Real Divergence Found — Not an Error, Reported As-Is

**Nile tilapia (O. niloticus) vs O. mossambicus salinity tolerance.** The plan calls for a "Nile/red tilapia (*Oreochromis niloticus* / hybrid)" profile. The only located quantitative salinity-tolerance study on pure *O. niloticus* (Metwaly et al. 2025) puts full survival/good growth at 0–10 ppt and shows real, non-trivial mortality by 15–20 ppt. But the only located multi-species IMTA precedent that includes tilapia alongside a bivalve and seaweed (Elle et al. 2024) ran at 25 ppt — and used *O. mossambicus*, a congener independently documented elsewhere as substantially more salt-tolerant than *O. niloticus*.

This is not a contradiction to paper over: it means the tilapia+green-mussel and tilapia+gracilaria compatibility rules in `imtaRules.ts` are only well-supported for salt-tolerant hybrid tilapia strains (which typically carry *O. mossambicus* ancestry), not for straight Nile tilapia at 25 ppt. `species.ts` and the compatibility rules both carry this caveat explicitly in `knownConflicts` / `lifeStageNotes` rather than silently blending the two species' data into one number. The tilapia+green-mussel `toleranceOverlapPpt` is left as `null` for exactly this reason — the two profiles' own documented ranges (tilapia 0–15 ppt vs mussel 16–33 ppt) do not actually overlap, even though the source paper ran them together successfully at 25 ppt under the more tolerant species.

**Bivalve species substitution.** The plan named "oysters/clams/mussels" generically. Research initially targeted Pacific oyster (*Crassostrea gigas*) — general salinity tolerance was directly verified (Zhao et al. 2012, PLoS ONE 7(9):e46244: occurs below 10‰, optimal 20–25‰, survives beyond 35‰) and a Sonora, Mexico shrimp+oyster+clam polyculture paper was located (Martínez-Córdova & Martínez-Porchas 2006, *Aquaculture* 258:321–326) — but its full text was blocked (403) on every mirror tried, so its specific stocking-density and salinity numbers could not be independently verified before use. Green mussel (*Perna viridis*) was substituted instead once Elle et al. (2024) turned up a directly-fetched, fully-quantified four-species system that co-cultures mussel with vannamei, seaweed, and tilapia in one dataset. The oyster research is recorded here as work done but not used, rather than silently dropped.

---

## Claims Rejected

None — every claim traced above either held on direct fetch or is flagged provisional; none contradicted another verified figure once checked.
