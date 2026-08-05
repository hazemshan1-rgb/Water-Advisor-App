// src/lib/types.ts

export type SourceType = "borewell" | "brackish" | "underground" | "surface";

export interface WaterParameters {
  salinityPpt: number;
  sodiumMgL?: number;
  potassiumMgL?: number;
  calciumMgL?: number;
  magnesiumMgL?: number;
  chlorideMgL?: number;
  alkalinityMgL?: number;
  pH: number;
  hardnessMgL?: number;
  tdsMgL?: number;
  temperatureC?: number;
  // Ch.2 §1 baseline panel, rows 13-16 and 19. Previously out of scope (see
  // plan's Global Constraints); brought in because the guide's own decision
  // tree gates on Fe/Mn/H2S/arsenic BEFORE salinity classification even
  // starts -- see sourceCharacterization.ts.
  ironMgL?: number;
  manganeseMgL?: number;
  hydrogenSulfideMgL?: number;
  arsenicMgL?: number;
  ammoniumMgL?: number;
  // Ch.7 §3-5 in-pond failure-mode parameters. Distinct from ammoniumMgL
  // above, which is specifically Ch.2's native/geological baseline concept
  // -- tanMgL is ongoing in-pond total ammonia nitrogen from feed/waste
  // accumulation, a different failure mode with different severity language
  // (Ch.7 §4 vs Ch.2 §3). Conflating the two fields would mean a genuinely
  // dangerous in-pond ammonia reading gets the Ch.2 "baseline load, not a
  // failure" framing -- see failureModeMatching.ts.
  tanMgL?: number;
  nitriteMgL?: number;
  doMgL?: number;
}

// Mirrors the guide's own two-tier Watch/Action-Trigger language (Ch.2 §3),
// plus two levels the guide's own wording implies but doesn't name:
// "critical" for anything the guide's decision tree treats as blocking
// ("do not stock", "do not use without treatment", "required before any
// further classification"), and "info" for flags the guide explicitly
// downgrades from a correction requirement (e.g. native ammonium).
export type Severity = "info" | "watch" | "action" | "critical";

// A disclosed, non-statistical completeness heuristic -- see
// engine/confidence.ts for exactly how this is computed. Not a calibrated
// probability; treat it as "how much of the guide's own baseline panel did
// we actually get," nothing more.
export type Confidence = "high" | "medium" | "low";

export interface Anomaly {
  message: string;
  severity: Severity;
}

export interface Site {
  id: string;
  name: string;
  location?: string;
  sourceType: SourceType;
  notes?: string;
  createdAt: string; // ISO date
}

// Ch.16 §3: whether a system exchanges water at all changes the LCSM-vs-RSS
// recommendation. "closed-system" = RAS/biofloc running months with
// near-zero exchange; "open-pond" = anything with meaningful exchange,
// rainfall, or soil contact -- the default this app assumes if unset.
export type SystemType = "open-pond" | "closed-system";

export interface Analysis {
  id: string;
  siteId: string;
  date: string; // ISO date
  parameters: WaterParameters;
  targetSpeciesIds: string[]; // 1 = single-species, 2+ = IMTA
  volumeM3?: number;
  // When set and above parameters.salinityPpt, triggers a salt-build plan
  // (see engine/saltBuilder.ts) alongside the usual correction dosingPlan.
  targetSalinityPpt?: number;
  systemType?: SystemType;
  // Postlarval age at stocking/transfer, in days since metamorphosis to PL
  // stage. Distinct from pond age -- this is about the animal, not the
  // water. Real direct-transfer survival data shows this matters enormously
  // at low salinity: 19.8% vs 83.8% survival at 8 ppt between PL-8 and
  // PL-22 (see species.ts's directTransferSalinityShock and
  // speciesCompatibility.ts). Optional and currently only checked against
  // for species with that data field populated (vannamei).
  postlarvalAgeDays?: number;
  diagnosisSnapshot?: DiagnosisResult;
  notes?: string;
}

export type TrophicRole = "primary" | "extractive-filter" | "extractive-algae" | "decomposer";

export interface SpeciesProfile {
  id: string;
  scientificName: string;
  commonName: string;
  category: "crustacean" | "fish" | "mollusc" | "algae" | "bacterial-consortium";
  trophicRole: TrophicRole;
  salinityToleranceRangePpt: [number, number];
  // Set when the upper bound above is this app's own operating-scope/
  // chapter-routing boundary rather than a documented biological survival
  // ceiling (e.g. vannamei's 30 ppt is where Ch.10 dilution strategy takes
  // over, not where the animal stops surviving -- real controlled trials
  // show 95%+ survival at 45 ppt). When set, exceeding the upper bound is
  // treated as "needs a different strategy" (action) rather than "likely
  // lethal" (critical) -- see speciesCompatibility.ts. Lower-bound
  // violations are always critical regardless of this field; osmotic
  // failure at the low end doesn't have the same "just route elsewhere"
  // escape hatch.
  upperBoundIsOperatingScope?: string;
  idealIonicRatios: Partial<Record<"Na:K" | "Mg:Ca" | "Na:Ca", number>>;
  sensitivityThresholds: {
    tanMgL?: [number, number];
    doMgL?: [number, number];
    phRange?: [number, number];
  };
  lifeStageNotes?: string;
  sourceCitation: string;
  // Real 24-hour DIRECT-TRANSFER (no gradual acclimation) survival data at
  // documented postlarval ages -- a genuinely different, much sharper risk
  // than the general chronic salinityToleranceRangePpt above. Only
  // populated where a real primary source exists (currently vannamei only,
  // Ogle et al. 1992). See speciesCompatibility.ts for how this is used.
  directTransferSalinityShock?: {
    citation: string;
    dataPoints: { postlarvalAgeDays: number; salinityPpt: number; survivalPercent: number }[];
  };
}

export interface ImtaCompatibilityRule {
  speciesIdA: string;
  speciesIdB: string;
  compatible: boolean;
  toleranceOverlapPpt: [number, number] | null;
  stockingRatioGuidance?: string;
  knownConflicts?: string;
  sourceCitation: string;
}

export interface FailureMode {
  id: string;
  symptomPattern: string;
  relatedParameters: (keyof WaterParameters)[];
  diagnosis: string;
  correctiveSteps: string[];
  sourceCitation: string;
  // Severity is a property of the failure mode itself (a molt-failure match
  // is always an action-level problem by definition), not computed per
  // instance -- unlike source anomalies, where severity depends on how far
  // below threshold a specific reading falls. Defaults to "action" if unset.
  severity?: Severity;
}

export interface DosingRecipe {
  id: string;
  targetRatio: string;
  amendmentCompound: string;
  formula: string;
  calculate: (
    params: WaterParameters,
    volumeM3: number
  ) => { compound: string; quantityKg: number; isGapBandFallback?: boolean; assumedZeroCurrent?: boolean }[];
}

// A single stage of a multi-stage correction protocol. Stage 1 delivers a
// fraction of the total correction; stage 2 (the remainder) is withheld
// until the operator retests and confirms stage 1 didn't overshoot. See
// engine/stagedDosing.ts for exactly what is and isn't guide-sourced here.
export interface DosingStep {
  stage: 1 | 2;
  compound: string;
  quantityKg: number;
  forParameter: string;
  severity: Severity;
  instructions: string;
}

// Ch.16 §1-2: LCSM and pure sea salt (RSS) need almost identical total mass
// per ppt (~1 kg/m3) -- they differ in composition/cost, not quantity. See
// data/saltFormulations.ts for the verified per-compound table.
export type SaltSource = "lcsm" | "sea-salt";

export interface SaltBuildStep {
  compound: string;
  quantity: number;
  unit: "kg" | "L";
}

export interface SaltBuildPlan {
  recommendedSource: SaltSource;
  recommendationReason: string;
  pptToRaise: number;
  steps: SaltBuildStep[];
}

export interface DiagnosisResult {
  sourceAnomalies: Anomaly[];
  perSpecies: Record<string, { riskLevel: "low" | "moderate" | "high"; deviations: Anomaly[] }>;
  imtaNotes: string[];
  matchedFailureModes: FailureMode[];
  dosingPlan: DosingStep[];
  // Present only when dosingPlan is non-empty; explains the staging
  // protocol's provenance once rather than repeating it per line item.
  dosingProtocolNote?: string;
  // Present only when Analysis.targetSalinityPpt is set and above the
  // current reading -- a separate question from dosingPlan's mineral
  // correction (see engine/saltBuilder.ts).
  saltBuildPlan?: SaltBuildPlan;
  confidence: Confidence;
  confidenceReasons: string[];
  // One entry per diagnostically-relevant field that wasn't provided,
  // phrased as "what this gap could be hiding" rather than just "missing."
  dataGaps: string[];
}
