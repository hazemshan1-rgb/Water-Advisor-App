// src/lib/engine/failureModeMatching.ts
import type { WaterParameters, FailureMode } from "../types";
import {
  FAILURE_MODES,
  POTASSIUM_MOLT_FAILURE_THRESHOLD_MGL,
  DO_CRASH_THRESHOLD_MGL,
  TAN_TOXICITY_THRESHOLD_MGL,
  NITRITE_TOXICITY_THRESHOLD_MGL,
} from "../data/failureModes";

function findMode(id: string): FailureMode {
  const mode = FAILURE_MODES.find((m) => m.id === id);
  if (!mode) throw new Error(`Failure mode "${id}" not found in FAILURE_MODES`);
  return mode;
}

export function matchFailureModes(params: WaterParameters): FailureMode[] {
  const matches: FailureMode[] = [];

  if (params.doMgL !== undefined && params.doMgL < DO_CRASH_THRESHOLD_MGL) {
    matches.push(findMode("dissolved-oxygen-crash"));
  }

  if (params.tanMgL !== undefined && params.tanMgL >= TAN_TOXICITY_THRESHOLD_MGL) {
    matches.push(findMode("ammonia-toxicity"));
  }

  if (params.nitriteMgL !== undefined && params.nitriteMgL >= NITRITE_TOXICITY_THRESHOLD_MGL) {
    matches.push(findMode("nitrite-toxicity"));
  }

  if (params.potassiumMgL !== undefined && params.potassiumMgL < POTASSIUM_MOLT_FAILURE_THRESHOLD_MGL) {
    matches.push(findMode("molt-failure-soft-shell"));
  }

  return matches;
}
