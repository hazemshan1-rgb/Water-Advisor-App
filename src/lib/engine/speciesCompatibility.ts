import type { WaterParameters, DiagnosisResult } from "../types";
import { getSpeciesById } from "../data/species";

const RATIO_TOLERANCE_FRACTION = 0.25; // +/-25% of target ratio before flagging as a deviation

export function checkSpeciesCompatibility(
  params: WaterParameters,
  speciesIds: string[]
): DiagnosisResult["perSpecies"] {
  const result: DiagnosisResult["perSpecies"] = {};

  for (const id of speciesIds) {
    const species = getSpeciesById(id);
    if (!species) continue;

    const deviations: string[] = [];
    const [minPpt, maxPpt] = species.salinityToleranceRangePpt;
    if (params.salinityPpt < minPpt || params.salinityPpt > maxPpt) {
      deviations.push(
        `salinity ${params.salinityPpt} ppt is outside ${species.commonName}'s tolerance range of ${minPpt}-${maxPpt} ppt.`
      );
    }

    const targetNaK = species.idealIonicRatios["Na:K"];
    if (targetNaK !== undefined && params.sodiumMgL !== undefined && params.potassiumMgL !== undefined) {
      if (params.potassiumMgL === 0) {
        deviations.push(
          `potassium reading is 0 mg/L — Na:K ratio cannot be computed and this is itself a critical deviation from ${species.commonName}'s target of ${targetNaK}:1.`
        );
      } else {
        const actualRatio = params.sodiumMgL / params.potassiumMgL;
        const deviationFraction = Math.abs(actualRatio - targetNaK) / targetNaK;
        if (deviationFraction > RATIO_TOLERANCE_FRACTION) {
          deviations.push(
            `Na:K ratio is ${actualRatio.toFixed(1)}:1, versus ${species.commonName}'s target of ${targetNaK}:1 (Ch.3 Part 2).`
          );
        }
      }
    }

    // Salinity outside tolerance range is always high risk regardless of other deviations.
    const outOfTolerance = params.salinityPpt < minPpt || params.salinityPpt > maxPpt;
    const riskLevel: "low" | "moderate" | "high" = outOfTolerance
      ? "high"
      : deviations.length === 0
        ? "low"
        : deviations.length === 1
          ? "moderate"
          : "high";

    result[id] = {
      riskLevel,
      deviations,
    };
  }

  return result;
}
