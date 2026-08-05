import type { Analysis, DiagnosisResult } from "../types";
import { characterizeSource } from "./sourceCharacterization";
import { checkSpeciesCompatibility } from "./speciesCompatibility";
import { checkImtaCompatibility } from "./imtaCompatibility";
import { matchFailureModes } from "./failureModeMatching";
import { DOSING_RECIPES } from "../data/dosingRecipes";

export function runDiagnosis(analysis: Analysis): DiagnosisResult {
  const { parameters, targetSpeciesIds, volumeM3 } = analysis;

  const sourceAnomalies = characterizeSource(parameters);
  const perSpecies = checkSpeciesCompatibility(parameters, targetSpeciesIds);
  const imtaNotes = checkImtaCompatibility(targetSpeciesIds);
  const matchedFailureModes = matchFailureModes(parameters);

  const dosingPlan = DOSING_RECIPES.flatMap((recipe) =>
    recipe.calculate(parameters, volumeM3 ?? 0).map((dose) => ({
      compound: dose.compound,
      quantityKg: dose.quantityKg,
      forParameter: recipe.targetRatio,
    }))
  ).filter((d) => d.quantityKg > 0);

  return { sourceAnomalies, perSpecies, imtaNotes, matchedFailureModes, dosingPlan };
}
