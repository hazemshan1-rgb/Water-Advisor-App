// src/lib/engine/sourceCharacterization.ts
import type { WaterParameters } from "../types";
import { classifySourceBySalinity, RED_FLAG_THRESHOLDS } from "../data/sourceNorms";

export { classifySourceBySalinity };

export function checkSourceRedFlags(params: WaterParameters): string[] {
  const flags: string[] = [];
  const t = RED_FLAG_THRESHOLDS;

  if (params.hardnessMgL !== undefined && params.alkalinityMgL !== undefined && params.alkalinityMgL > 0) {
    const ratio = params.hardnessMgL / params.alkalinityMgL;
    if (ratio > t.hardnessToAlkalinityActionRatio) {
      flags.push(
        `Hardness is more than ${t.hardnessToAlkalinityActionRatio}x alkalinity (${params.hardnessMgL}:${params.alkalinityMgL}) — Ca-dominant, non-buffering water. Do not assume "hard = mineral-rich."`
      );
    } else if (ratio > t.hardnessToAlkalinityWatchRatio) {
      flags.push(
        `Hardness is more than ${t.hardnessToAlkalinityWatchRatio}x alkalinity (${params.hardnessMgL}:${params.alkalinityMgL}) — watch for a Ca-dominant, non-buffering water.`
      );
    }
  }

  if (params.potassiumMgL !== undefined) {
    if (params.potassiumMgL < t.potassiumActionMgL) {
      flags.push(
        `potassium at ${params.potassiumMgL} mg/L is below the ${t.potassiumActionMgL} mg/L action trigger — mandatory fortification regardless of salinity band.`
      );
    } else if (params.potassiumMgL < t.potassiumWatchMgL) {
      flags.push(`potassium at ${params.potassiumMgL} mg/L is below the ${t.potassiumWatchMgL} mg/L watch line.`);
    }
  }

  if (params.chlorideMgL !== undefined && params.salinityPpt < 5) {
    if (params.chlorideMgL < t.chlorideActionMgLAtLowSalinity) {
      flags.push(
        `chloride at ${params.chlorideMgL} mg/L is below the ${t.chlorideActionMgLAtLowSalinity} mg/L action floor at this salinity — route to Ch.6 chloride:nitrite protocol before stocking.`
      );
    } else if (params.chlorideMgL < t.chlorideWatchMgLAtLowSalinity) {
      flags.push(
        `chloride at ${params.chlorideMgL} mg/L is below the ${t.chlorideWatchMgLAtLowSalinity} mg/L watch floor at low salinity — loss of nitrite-toxicity protection risk.`
      );
    }
  }

  return flags;
}

export function characterizeSource(params: WaterParameters): string[] {
  const classification = classifySourceBySalinity(params.salinityPpt);
  const anomalies = [`Salinity band: ${classification.band} — route to ${classification.routeToChapter}. ${classification.note}`];
  return anomalies.concat(checkSourceRedFlags(params));
}
