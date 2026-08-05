import type { Analysis, DiagnosisResult } from "../types";
import { characterizeSource } from "./sourceCharacterization";
import { checkSpeciesCompatibility } from "./speciesCompatibility";
import { checkImtaCompatibility } from "./imtaCompatibility";
import { matchFailureModes } from "./failureModeMatching";
import { stageDosing } from "./stagedDosing";
import { computeConfidence } from "./confidence";
import { buildSalinityDose } from "./saltBuilder";
import { DOSING_RECIPES } from "../data/dosingRecipes";

const DOSING_PROTOCOL_NOTE =
  "Doses below are split into two stages rather than applied all at once. Stage 1 delivers roughly half the total correction; stage 2 (the remainder) should only be applied after retesting confirms stage 1 moved the reading toward target without overshooting. The stage split itself is a conservative engineering safety practice, not a number cited from the guide — no published safe correction-rate figure was found for shrimp pond mineral dosing (see the app's stress-test log).";

export function runDiagnosis(analysis: Analysis): DiagnosisResult {
  const { parameters, targetSpeciesIds, volumeM3, targetSalinityPpt, systemType, postlarvalAgeDays } = analysis;

  const sourceAnomalies = characterizeSource(parameters);
  const perSpecies = checkSpeciesCompatibility(parameters, targetSpeciesIds, postlarvalAgeDays);
  const imtaNotes = checkImtaCompatibility(targetSpeciesIds);
  const matchedFailureModes = matchFailureModes(parameters);

  const rawDoses = DOSING_RECIPES.flatMap((recipe) =>
    recipe.calculate(parameters, volumeM3 ?? 0).map((dose) => ({
      compound: dose.compound,
      quantityKg: dose.quantityKg,
      forParameter: recipe.targetRatio,
      isGapBandFallback: dose.isGapBandFallback,
      assumedZeroCurrent: dose.assumedZeroCurrent,
    }))
  ).filter((d) => d.quantityKg > 0);

  const dosingPlan = stageDosing(rawDoses);
  const { confidence, confidenceReasons, dataGaps } = computeConfidence(parameters);

  const saltBuildPlan =
    targetSalinityPpt !== undefined
      ? (buildSalinityDose(parameters.salinityPpt, targetSalinityPpt, volumeM3 ?? 0, systemType) ?? undefined)
      : undefined;

  return {
    sourceAnomalies,
    perSpecies,
    imtaNotes,
    matchedFailureModes,
    dosingPlan,
    dosingProtocolNote: dosingPlan.length > 0 ? DOSING_PROTOCOL_NOTE : undefined,
    saltBuildPlan,
    confidence,
    confidenceReasons,
    dataGaps,
  };
}
