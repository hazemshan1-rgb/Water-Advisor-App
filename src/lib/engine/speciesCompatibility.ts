import type { Anomaly, WaterParameters, DiagnosisResult, SpeciesProfile } from "../types";
import { getSpeciesById } from "../data/species";

const RATIO_TOLERANCE_FRACTION = 0.25; // +/-25% of target ratio before flagging as a deviation

/**
 * Checks direct-transfer (no gradual acclimation) survival risk at a given
 * postlarval age, using only the two real documented ages (species.ts's
 * directTransferSalinityShock) rather than interpolating a curve the data
 * doesn't actually support. Returns null when the species has no such data,
 * no age was provided, or the age/salinity combination isn't close enough
 * to a documented risk point to say anything evidence-based.
 */
function checkPostlarvalTransferShock(
  species: SpeciesProfile,
  salinityPpt: number,
  postlarvalAgeDays: number
): Anomaly | null {
  const shock = species.directTransferSalinityShock;
  if (!shock) return null;
  const { citation } = shock;

  if (postlarvalAgeDays <= 8) {
    if (salinityPpt <= 8) {
      return {
        message: `Direct transfer of a ${postlarvalAgeDays}-day-old postlarva to ${salinityPpt} ppt without gradual step-down acclimation carries severe documented risk: the nearest real data point (PL-8, 24-hour direct transfer) showed 19.8% survival at 8 ppt, 8.2% at 4 ppt, and 1.7% at 2 ppt (${citation}). Follow the Ch.6 §5 acclimation schedule rather than stocking directly.`,
        severity: "critical",
      };
    }
    if (salinityPpt <= 16) {
      return {
        message: `A ${postlarvalAgeDays}-day-old postlarva is close to the age where documented direct-transfer survival falls sharply below this salinity band: PL-8 survival was 92.8% at 16 ppt but only 19.8% at 8 ppt (${citation}). Confirm the actual endpoint isn't lower than intended, and acclimate gradually regardless.`,
        severity: "watch",
      };
    }
    return null;
  }

  if (postlarvalAgeDays < 22) {
    if (salinityPpt <= 8) {
      return {
        message: `No direct survival data exists for a ${postlarvalAgeDays}-day-old postlarva specifically — the nearest documented (younger) age, PL-8, showed severe direct-transfer mortality at this salinity (19.8% survival at 8 ppt), and the next documented (older) age, PL-22, is still ${22 - postlarvalAgeDays} days away. Don't assume PL-22-level tolerance has already been reached; acclimate gradually (${citation}).`,
        severity: "watch",
      };
    }
    return null;
  }

  // postlarvalAgeDays >= 22 -- the better-tolerant end of the documented
  // range, but still a real, non-trivial risk at the lowest salinities.
  if (salinityPpt <= 2) {
    return {
      message: `Even at 22+ days old, documented direct-transfer survival at ${salinityPpt} ppt was only 40.2% (vs 99.2% at full-strength seawater) (${citation}). Gradual acclimation still meaningfully reduces this risk.`,
      severity: "action",
    };
  }
  if (salinityPpt <= 4) {
    return {
      message: `Documented direct-transfer survival for 22-day-old postlarvae at ${salinityPpt} ppt was 63.4% (${citation}) — real risk, though far better tolerated than at younger ages. Gradual acclimation still reduces this further.`,
      severity: "watch",
    };
  }
  return null;
}

export function checkSpeciesCompatibility(
  params: WaterParameters,
  speciesIds: string[],
  postlarvalAgeDays?: number
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

    if (postlarvalAgeDays !== undefined) {
      const transferShock = checkPostlarvalTransferShock(species, params.salinityPpt, postlarvalAgeDays);
      if (transferShock) deviations.push(transferShock);
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
