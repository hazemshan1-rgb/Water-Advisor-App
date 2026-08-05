// src/lib/engine/saltBuilder.ts
import type { SaltBuildPlan, SaltBuildStep, SaltSource, SystemType } from "../types";
import { LCSM_FORMULA, PURE_SEA_SALT_KG_PER_M3_PER_PPT } from "../data/saltFormulations";

function roundQty(n: number): number {
  return Math.round(n * 100) / 100;
}

// Ch.16 §3: LCSM is the default -- confirmed equivalent to RSS on
// survival/growth at 3-15 ppt, ~50% cheaper. Full sea salt is recommended
// only for closed systems with near-zero exchange, on the reasoned-but-not-
// directly-tested basis that RSS's fuller trace-mineral profile matters more
// when nothing external tops those minerals up. Not a citation -- disclosed
// as such in the reason text itself.
function chooseSource(systemType: SystemType): { source: SaltSource; reason: string } {
  if (systemType === "closed-system") {
    return {
      source: "sea-salt",
      reason:
        "Closed system with minimal water exchange — full reconstituted sea salt recommended for its complete trace-mineral profile (Ch.16 §3). This is a reasoned caution, not a tested finding: no study has directly measured whether LCSM's omitted trace minerals matter over a long closed cycle.",
    };
  }
  return {
    source: "lcsm",
    reason:
      "Open system with some water exchange — LCSM confirmed equivalent to reconstituted sea salt on survival, growth, and osmoregulation at 3–15 ppt, roughly 50% cheaper (Ch.16 §1).",
  };
}

/**
 * Ch.16 §2: builds a salt dosing plan to raise salinity from its current
 * reading to a target. Returns null if there's nothing to build (target at
 * or below current -- that's a dilution problem per Ch.2 §4, not this
 * chapter's scope, same honesty principle classifySourceBySalinity applies).
 * LCSM scaling (per 10,000 L per 1 ppt) is confirmed by the actual trials at
 * 3, 6, and 15 ppt -- proportional scaling within that range is supported by
 * research, not extrapolation. Outside it, still applied (no other rule
 * exists), but not claimed as separately tested.
 */
export function buildSalinityDose(
  currentSalinityPpt: number,
  targetSalinityPpt: number,
  volumeM3: number,
  systemType: SystemType = "open-pond"
): SaltBuildPlan | null {
  const pptToRaise = targetSalinityPpt - currentSalinityPpt;
  if (pptToRaise <= 0 || volumeM3 <= 0) return null;

  const { source, reason } = chooseSource(systemType);

  const steps: SaltBuildStep[] =
    source === "lcsm"
      ? LCSM_FORMULA.map((c) => ({
          compound: c.compound,
          // table is per 10,000 L per 1 ppt; volumeM3 * 1000 = litres.
          quantity: roundQty(c.quantityPer10000LPer1Ppt * ((volumeM3 * 1000) / 10000) * pptToRaise),
          unit: c.unit,
        }))
      : [
          {
            compound: "Reconstituted sea salt (commercial RSS)",
            quantity: roundQty(PURE_SEA_SALT_KG_PER_M3_PER_PPT * volumeM3 * pptToRaise),
            unit: "kg",
          },
        ];

  return { recommendedSource: source, recommendationReason: reason, pptToRaise, steps };
}
