// src/lib/engine/sourceCharacterization.ts
import type { Anomaly, WaterParameters } from "../types";
import { classifySourceBySalinity, RED_FLAG_THRESHOLDS } from "../data/sourceNorms";
import { UNIONIZED_AMMONIA_GROWTH_IMPAIRMENT_MGL, TAN_TOXICITY_THRESHOLD_MGL } from "../data/failureModes";
import { calculateUnionizedAmmoniaMgL } from "./ammoniaChemistry";

export { classifySourceBySalinity };

// Severity assignment rule, applied consistently below: a threshold row
// gets "critical" only when the guide's own "Immediate Action" wording for
// that row is blocking language -- "do not stock", "do not use", "before
// stocking", "required before any further classification". Everything else
// maps to the guide's own Watch/Action-Trigger split ("watch"/"action").
// Ammonium is the one deliberate exception: the guide explicitly
// de-escalates it ("not a pond-management failure"), so both its tiers are
// shifted down one level from the mechanical default -- see the comment
// at that check.

/**
 * Ch.2 §4's decision tree gates on Fe/Mn/H2S/arsenic BEFORE salinity
 * classification even runs ("required BEFORE any further classification" /
 * "Do not stock. Treat or reject source."). This function mirrors that:
 * called first by characterizeSource, before the salinity band note.
 */
function checkBlockingContaminants(params: WaterParameters): Anomaly[] {
  const flags: Anomaly[] = [];
  const t = RED_FLAG_THRESHOLDS;

  if (params.ironMgL !== undefined) {
    if (params.ironMgL > t.ironActionMgL) {
      flags.push({
        message: `Iron at ${params.ironMgL} mg/L is above the ${t.ironActionMgL} mg/L action trigger — aeration + settling/oxidation is required before pond use (Ch.2 §3-4).`,
        severity: "critical",
      });
    } else if (params.ironMgL > t.ironWatchMgL) {
      flags.push({
        message: `Iron at ${params.ironMgL} mg/L is above the ${t.ironWatchMgL} mg/L watch line — monitor for gill/biofilter fouling risk.`,
        severity: "watch",
      });
    }
  }

  if (params.manganeseMgL !== undefined) {
    if (params.manganeseMgL > t.manganeseActionMgL) {
      flags.push({
        message: `Manganese at ${params.manganeseMgL} mg/L is above the ${t.manganeseActionMgL} mg/L action trigger — aeration + settling is required before pond use; Mn oxidises slower than iron and needs longer retention (Ch.2 §3-4).`,
        severity: "critical",
      });
    } else if (params.manganeseMgL > t.manganeseWatchMgL) {
      flags.push({
        message: `Manganese at ${params.manganeseMgL} mg/L is above the ${t.manganeseWatchMgL} mg/L watch line — easy to miss, slower to oxidise than iron.`,
        severity: "watch",
      });
    }
  }

  if (params.hydrogenSulfideMgL !== undefined && params.hydrogenSulfideMgL > 0) {
    flags.push({
      message: `Hydrogen sulfide detected at ${params.hydrogenSulfideMgL} mg/L — toxic even at trace levels. Aggressive aeration/degassing is required before any other treatment (Ch.2 §3-4). Do not proceed with classification until resolved.`,
      severity: "critical",
    });
  }

  if (params.arsenicMgL !== undefined) {
    if (params.arsenicMgL > t.arsenicWatchMgL) {
      flags.push({
        message: `Arsenic at ${params.arsenicMgL} mg/L is above the ${t.arsenicWatchMgL} mg/L watch line — do not use without treatment; escalate to lab confirmation (Ch.2 §3-4).`,
        severity: "critical",
      });
    }
  }

  return flags;
}

function checkNonContaminantRedFlags(params: WaterParameters): Anomaly[] {
  const flags: Anomaly[] = [];
  const t = RED_FLAG_THRESHOLDS;

  if (params.hardnessMgL !== undefined && params.alkalinityMgL !== undefined && params.alkalinityMgL > 0) {
    const ratio = params.hardnessMgL / params.alkalinityMgL;
    if (ratio > t.hardnessToAlkalinityActionRatio) {
      flags.push({
        message: `Hardness is more than ${t.hardnessToAlkalinityActionRatio}x alkalinity (${params.hardnessMgL}:${params.alkalinityMgL}) — Ca-dominant, non-buffering water. Do not assume "hard = mineral-rich."`,
        severity: "action",
      });
    } else if (ratio > t.hardnessToAlkalinityWatchRatio) {
      flags.push({
        message: `Hardness is more than ${t.hardnessToAlkalinityWatchRatio}x alkalinity (${params.hardnessMgL}:${params.alkalinityMgL}) — watch for a Ca-dominant, non-buffering water.`,
        severity: "watch",
      });
    }
  }

  if (params.potassiumMgL !== undefined) {
    if (params.potassiumMgL < t.potassiumActionMgL) {
      flags.push({
        message: `potassium at ${params.potassiumMgL} mg/L is below the ${t.potassiumActionMgL} mg/L action trigger — mandatory fortification regardless of salinity band.`,
        severity: "action",
      });
    } else if (params.potassiumMgL < t.potassiumWatchMgL) {
      flags.push({
        message: `potassium at ${params.potassiumMgL} mg/L is below the ${t.potassiumWatchMgL} mg/L watch line.`,
        severity: "watch",
      });
    }
  }

  if (params.magnesiumMgL !== undefined) {
    if (params.salinityPpt >= 10 && params.magnesiumMgL < t.magnesiumFloorAtStandardSalinityMgL) {
      flags.push({
        message: `magnesium at ${params.magnesiumMgL} mg/L is below the ${t.magnesiumFloorAtStandardSalinityMgL} mg/L floor for the >=10 ppt target band (Ch.2 §3) — route to Ch.6 absolute-threshold table, not ratio dilution alone.`,
        severity: "action",
      });
    } else if (params.salinityPpt >= 1 && params.salinityPpt < 5 && params.magnesiumMgL < t.magnesiumFloorAtLowSalinityMgL) {
      flags.push({
        message: `magnesium at ${params.magnesiumMgL} mg/L is below the ${t.magnesiumFloorAtLowSalinityMgL} mg/L floor for the 1-5 ppt target band (Ch.2 §3).`,
        severity: "action",
      });
    }
  }

  if (params.chlorideMgL !== undefined && params.salinityPpt < 5) {
    if (params.chlorideMgL < t.chlorideActionMgLAtLowSalinity) {
      flags.push({
        message: `chloride at ${params.chlorideMgL} mg/L is below the ${t.chlorideActionMgLAtLowSalinity} mg/L action floor at this salinity — route to Ch.6 chloride:nitrite protocol before stocking.`,
        severity: "critical",
      });
    } else if (params.chlorideMgL < t.chlorideWatchMgLAtLowSalinity) {
      flags.push({
        message: `chloride at ${params.chlorideMgL} mg/L is below the ${t.chlorideWatchMgLAtLowSalinity} mg/L watch floor at low salinity — loss of nitrite-toxicity protection risk.`,
        severity: "watch",
      });
    }
  }

  // Deliberate exception to the mechanical Watch->watch / Action->action
  // mapping: the guide explicitly frames native ammonium as an operational
  // adjustment, not a failure ("Treat as baseline load... adjust
  // feeding/monitoring targets accordingly") -- both tiers are shifted down
  // one severity level from what the table's Watch/Action split would
  // otherwise imply.
  if (params.ammoniumMgL !== undefined) {
    if (params.ammoniumMgL > t.ammoniumActionMgL) {
      flags.push({
        message: `Native ammonium at ${params.ammoniumMgL} mg/L is above the ${t.ammoniumActionMgL} mg/L level — treat as baseline geological load, not a pond-management failure; adjust feeding/monitoring targets accordingly (Ch.2 §3).`,
        severity: "watch",
      });
    } else if (params.ammoniumMgL > t.ammoniumWatchMgL) {
      flags.push({
        message: `Native ammonium at ${params.ammoniumMgL} mg/L is above the ${t.ammoniumWatchMgL} mg/L level — some geological formations carry native ammonium; do not assume zero.`,
        severity: "info",
      });
    }

    // Field-confusion guard: ammoniumMgL is meant to be a source-water
    // BASELINE reading, typically low and geological in origin. A value
    // this high is far more consistent with someone entering an in-pond
    // post-stocking ammonia test in the wrong field -- the "Total ammonia
    // nitrogen -- in-pond" field is a separate, deliberately distinct
    // parameter (see ParameterForm.tsx labels and the failureModeMatching
    // test documenting they are NOT aliases). Fires independently of the
    // tiers above so it still surfaces even when the raw value already
    // triggered the "action" branch.
    if (params.ammoniumMgL >= TAN_TOXICITY_THRESHOLD_MGL && params.tanMgL === undefined) {
      flags.push({
        message: `${params.ammoniumMgL} mg/L is unusually high for a source-water ammonium baseline — if this reading was actually taken in-pond after stocking, it belongs in "Total ammonia nitrogen — in-pond", not here. Entered as source ammonium, it will NOT trigger the ammonia-toxicity failure-mode check.`,
        severity: "watch",
      });
    }
  }

  // Ch.7 §3/§4/§5 in-pond failure-mode watch tiers. The corresponding
  // critical-tier matches (DO_CRASH_THRESHOLD_MGL, TAN_TOXICITY_THRESHOLD_MGL,
  // NITRITE_TOXICITY_THRESHOLD_MGL) live in failureModeMatching.ts -- same
  // dual-layer pattern already used for potassium above.
  if (params.doMgL !== undefined && params.doMgL < t.doWatchMgL) {
    flags.push({
      message: `Dissolved oxygen at ${params.doMgL} mg/L is below the ${t.doWatchMgL} mg/L watch line — growth is limited even without a crash. Confirm this is a dawn reading, not midday (Ch.7 §3).`,
      severity: "watch",
    });
  }

  if (params.tanMgL !== undefined) {
    const unionizedMgL =
      params.pH !== undefined && params.temperatureC !== undefined
        ? calculateUnionizedAmmoniaMgL(params.tanMgL, params.pH, params.temperatureC)
        : undefined;

    if (unionizedMgL !== undefined && unionizedMgL >= UNIONIZED_AMMONIA_GROWTH_IMPAIRMENT_MGL) {
      flags.push({
        message: `Un-ionized ammonia (NH3) works out to roughly ${unionizedMgL.toFixed(2)} mg/L from ${params.tanMgL} mg/L TAN at pH ${params.pH}/${params.temperatureC}C — above the ${UNIONIZED_AMMONIA_GROWTH_IMPAIRMENT_MGL} mg/L level documented to cut growth by roughly half, even before the lethal range (Ch.7 §4, Emerson et al. 1975 equilibrium).`,
        severity: "watch",
      });
    } else if (unionizedMgL === undefined && params.tanMgL > t.tanWatchMgL) {
      flags.push({
        message: `Total ammonia nitrogen at ${params.tanMgL} mg/L is above the ${t.tanWatchMgL} mg/L watch line — test alongside pH and temperature, both change how toxic this reading actually is (Ch.7 §4).`,
        severity: "watch",
      });
    }
  }

  if (params.nitriteMgL !== undefined && params.nitriteMgL > t.nitriteWatchMgL) {
    flags.push({
      message: `Nitrite-nitrogen at ${params.nitriteMgL} mg/L is above the ${t.nitriteWatchMgL} mg/L standing target — tolerance depends heavily on chloride/salinity; a source that tested low on chloride has far less protective margin (Ch.6 §3, Ch.7 §5).`,
      severity: "watch",
    });
  }

  return flags;
}

export function checkSourceRedFlags(params: WaterParameters): Anomaly[] {
  return [...checkBlockingContaminants(params), ...checkNonContaminantRedFlags(params)];
}

/**
 * Ordering mirrors Ch.2 §4's actual decision tree: Fe/Mn/H2S/arsenic are
 * checked and surfaced FIRST, before the salinity band note, because the
 * guide gates on them before classification even runs. Everything else
 * (hardness/alkalinity, potassium, magnesium, chloride, ammonium) follows
 * the band note, same as before.
 */
export function characterizeSource(params: WaterParameters): Anomaly[] {
  const classification = classifySourceBySalinity(params.salinityPpt);
  const bandSeverity =
    classification.band === "zero-salinity-edge"
      ? "critical"
      : classification.band === "unclassified-gap"
        ? "watch"
        : "info";
  const bandAnomaly: Anomaly = {
    message: `Salinity band: ${classification.band} — route to ${classification.routeToChapter}. ${classification.note}`,
    severity: bandSeverity,
  };
  return [
    ...checkBlockingContaminants(params),
    bandAnomaly,
    ...checkNonContaminantRedFlags(params),
  ];
}
