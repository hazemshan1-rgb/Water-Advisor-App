import type { Anomaly, WaterParameters, DiagnosisResult } from "../types";
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

    const deviations: Anomaly[] = [];
    const [minPpt, maxPpt] = species.salinityToleranceRangePpt;
    const belowRange = params.salinityPpt < minPpt;
    const aboveRange = params.salinityPpt > maxPpt;
    if (belowRange) {
      // Low-end violations get no downgrade: osmotic failure at the low
      // end doesn't have a "just route elsewhere" escape hatch the way a
      // high-salinity source does (dilution).
      deviations.push({
        message: `salinity ${params.salinityPpt} ppt is below ${species.commonName}'s tolerance range of ${minPpt}-${maxPpt} ppt.`,
        severity: "critical",
      });
    } else if (aboveRange) {
      if (species.upperBoundIsOperatingScope) {
        deviations.push({
          message: `salinity ${params.salinityPpt} ppt is above ${species.commonName}'s ${maxPpt} ppt operating-scope boundary — this needs a different handling strategy, not necessarily a survival risk. ${species.upperBoundIsOperatingScope}`,
          severity: "action",
        });
      } else {
        deviations.push({
          message: `salinity ${params.salinityPpt} ppt is above ${species.commonName}'s tolerance range of ${minPpt}-${maxPpt} ppt.`,
          severity: "critical",
        });
      }
    }

    const targetNaK = species.idealIonicRatios["Na:K"];
    if (targetNaK !== undefined && params.sodiumMgL !== undefined && params.potassiumMgL !== undefined) {
      if (params.potassiumMgL === 0) {
        deviations.push({
          message: `potassium reading is 0 mg/L — Na:K ratio cannot be computed and this is itself a critical deviation from ${species.commonName}'s target of ${targetNaK}:1.`,
          severity: "critical",
        });
      } else {
        const actualRatio = params.sodiumMgL / params.potassiumMgL;
        const deviationFraction = Math.abs(actualRatio - targetNaK) / targetNaK;
        if (deviationFraction > RATIO_TOLERANCE_FRACTION) {
          deviations.push({
            message: `Na:K ratio is ${actualRatio.toFixed(1)}:1, versus ${species.commonName}'s target of ${targetNaK}:1 (Ch.3 Part 2).`,
            severity: "action",
          });
        }
      }
    }

    // A critical-severity deviation (below range, or above range with no
    // operating-scope escape hatch) is always high risk regardless of other
    // deviations. An above-range operating-scope deviation is real but not
    // automatically the worst case -- it falls through to the normal
    // deviation-count scoring below.
    const hasCriticalDeviation = deviations.some((d) => d.severity === "critical");
    const riskLevel: "low" | "moderate" | "high" = hasCriticalDeviation
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
