// src/lib/engine/failureModeMatching.ts
import type { WaterParameters, FailureMode } from "../types";
import { FAILURE_MODES, POTASSIUM_MOLT_FAILURE_THRESHOLD_MGL } from "../data/failureModes";

export function matchFailureModes(params: WaterParameters): FailureMode[] {
  const matches: FailureMode[] = [];

  const moltFailure = FAILURE_MODES.find((m) => m.id === "molt-failure-soft-shell")!;
  if (params.potassiumMgL !== undefined && params.potassiumMgL < POTASSIUM_MOLT_FAILURE_THRESHOLD_MGL) {
    matches.push(moltFailure);
  }

  return matches;
}
