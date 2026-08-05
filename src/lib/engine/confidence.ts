// src/lib/engine/confidence.ts
import type { Confidence, WaterParameters } from "../types";
import { classifySourceBySalinity } from "../data/sourceNorms";

// Disclosed, non-statistical heuristic -- see the Confidence type's comment
// in types.ts. "Key fields" mirror Ch.2 §1's own baseline test panel,
// restricted to the fields WaterParameters actually models. salinityPpt and
// pH are required by the type already, so they're never "missing" here.
const KEY_OPTIONAL_FIELDS: (keyof WaterParameters)[] = [
  "sodiumMgL",
  "potassiumMgL",
  "calciumMgL",
  "magnesiumMgL",
  "chlorideMgL",
  "alkalinityMgL",
  "hardnessMgL",
  "ironMgL",
  "manganeseMgL",
  "hydrogenSulfideMgL",
  "arsenicMgL",
  "ammoniumMgL",
  "doMgL",
  "tanMgL",
  "nitriteMgL",
];

const FIELD_LABELS: Partial<Record<keyof WaterParameters, string>> = {
  sodiumMgL: "sodium",
  potassiumMgL: "potassium",
  calciumMgL: "calcium",
  magnesiumMgL: "magnesium",
  chlorideMgL: "chloride",
  alkalinityMgL: "alkalinity",
  hardnessMgL: "hardness",
  ironMgL: "iron",
  manganeseMgL: "manganese",
  hydrogenSulfideMgL: "hydrogen sulfide",
  arsenicMgL: "arsenic",
  ammoniumMgL: "ammonium",
  doMgL: "dissolved oxygen",
  tanMgL: "total ammonia nitrogen (in-pond)",
  nitriteMgL: "nitrite",
};

const FIELD_STAKES: Partial<Record<keyof WaterParameters, string>> = {
  sodiumMgL: "blocks the Na:K ratio check against species targets",
  potassiumMgL: "blocks assessment of the single most common molt-failure driver",
  calciumMgL: "limits hardness-vs-alkalinity interpretation",
  magnesiumMgL: "blocks the Ch.6 absolute mineral floor check, a documented molt-failure driver",
  chlorideMgL: "blocks the low-salinity nitrite-protection floor check",
  alkalinityMgL: "blocks buffering-capacity assessment and the hardness-vs-alkalinity mismatch check",
  hardnessMgL: "blocks the Ca-dominant, non-buffering water check",
  ironMgL: "could hide a gill/biofilter fouling risk (Ch.2 §3)",
  manganeseMgL: "could hide a slower-oxidising fouling risk that field kits alone commonly miss (Ch.2 §5)",
  hydrogenSulfideMgL: "could hide a toxic-at-trace-levels risk the guide treats as blocking (Ch.2 §4)",
  arsenicMgL: "could hide a regulatory/long-term health risk in known-risk geology (Ch.2 §1 row 19)",
  ammoniumMgL: "could hide a native geological ammonium load that needs different handling than a pond-management failure",
  doMgL: "could hide a dawn crash risk — DO below 2 mg/L can cause mass mortality within 1-2 hours (Ch.7 §3)",
  tanMgL: "could hide an in-pond ammonia toxicity risk distinct from source-water ammonium (Ch.7 §4)",
  nitriteMgL: "could hide an immune-suppression or lethal nitrite risk, especially if chloride/salinity is also low (Ch.7 §5)",
};

export interface ConfidenceResult {
  confidence: Confidence;
  confidenceReasons: string[];
  dataGaps: string[];
}

const RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };

export function computeConfidence(params: WaterParameters): ConfidenceResult {
  const missing = KEY_OPTIONAL_FIELDS.filter((f) => params[f] === undefined);
  const dataGaps = missing.map((f) => `${FIELD_LABELS[f]} not provided — ${FIELD_STAKES[f]}.`);

  const band = classifySourceBySalinity(params.salinityPpt).band;
  const reasons: string[] = [];

  let bandCap: Confidence = "high";
  if (band === "zero-salinity-edge") {
    bandCap = "low";
    reasons.push(
      "Salinity is below 1 ppt — the guide requires senior review before proceeding at all, so no automated diagnosis here should be treated as high confidence."
    );
  } else if (band === "unclassified-gap") {
    bandCap = "medium";
    reasons.push(
      "Salinity falls in the 5-10 ppt band the guide's own decision tree doesn't resolve — dosing targets shown use a disclosed conservative fallback, not a direct citation."
    );
  }

  // Reconsidered 2026-08-05 after KEY_OPTIONAL_FIELDS grew 12->15 (added
  // doMgL/tanMgL/nitriteMgL): kept the same absolute cutoffs rather than
  // rescaling proportionally. These are tied to specific field STAKES
  // (FIELD_STAKES above), not a pure percentage score, so "missing 3"
  // means the same thing regardless of the total -- e.g. providing every
  // classic Ch.2 field but skipping all 3 pond-management readings (DO/
  // TAN/nitrite) is exactly 3 missing, and genuinely deserves "medium":
  // that's a complete source-water screen but zero in-pond health data,
  // a real gap worth flagging, not an artifact of the field count change.
  let completenessCap: Confidence = "high";
  if (missing.length >= 6) {
    completenessCap = "low";
    reasons.push(`${missing.length} of ${KEY_OPTIONAL_FIELDS.length} key parameters are missing — treat this as a screening pass, not a full diagnosis.`);
  } else if (missing.length >= 3) {
    completenessCap = "medium";
    reasons.push(`${missing.length} of ${KEY_OPTIONAL_FIELDS.length} key parameters are missing.`);
  }

  const confidence: Confidence = RANK[bandCap] < RANK[completenessCap] ? bandCap : completenessCap;

  if (reasons.length === 0) {
    reasons.push("All key parameters provided and salinity falls in a documented band.");
  }

  return { confidence, confidenceReasons: reasons, dataGaps };
}
