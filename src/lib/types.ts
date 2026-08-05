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
}

export interface DosingRecipe {
  id: string;
  targetRatio: string;
  amendmentCompound: string;
  formula: string;
  calculate: (
    params: WaterParameters,
    volumeM3: number
  ) => { compound: string; quantityKg: number }[];
}

export interface DiagnosisResult {
  sourceAnomalies: string[];
  perSpecies: Record<string, { riskLevel: "low" | "moderate" | "high"; deviations: string[] }>;
  imtaNotes: string[];
  matchedFailureModes: FailureMode[];
  dosingPlan: { compound: string; quantityKg: number; forParameter: string }[];
}
