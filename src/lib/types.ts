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

export interface Analysis {
  id: string;
  siteId: string;
  date: string; // ISO date
  parameters: WaterParameters;
  targetSpeciesIds: string[]; // 1 = single-species, 2+ = IMTA
  volumeM3?: number;
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
  idealIonicRatios: Partial<Record<"Na:K" | "Mg:Ca" | "Na:Ca", number>>;
  sensitivityThresholds: {
    tanMgL?: [number, number];
    doMgL?: [number, number];
    phRange?: [number, number];
  };
  lifeStageNotes?: string;
  sourceCitation: string;
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
  ) => { compound: string; quantityKg: number; isGapBandFallback?: boolean }[];
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

export interface DiagnosisResult {
  sourceAnomalies: Anomaly[];
  perSpecies: Record<string, { riskLevel: "low" | "moderate" | "high"; deviations: Anomaly[] }>;
  imtaNotes: string[];
  matchedFailureModes: FailureMode[];
  dosingPlan: DosingStep[];
  // Present only when dosingPlan is non-empty; explains the staging
  // protocol's provenance once rather than repeating it per line item.
  dosingProtocolNote?: string;
  confidence: Confidence;
  confidenceReasons: string[];
  // One entry per diagnostically-relevant field that wasn't provided,
  // phrased as "what this gap could be hiding" rather than just "missing."
  dataGaps: string[];
}
