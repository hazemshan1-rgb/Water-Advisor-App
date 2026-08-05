// src/lib/engine/trendAnalysis.ts
//
// Deliberately scoped narrower than the original "trend/historical failure
// modes" idea (stratification, muscle necrosis, poor-FCR, AHPND/WSSV risk).
// Three of those four don't belong in a water-chemistry engine at all:
//
// - Stratification: the app only collects a single dawn DO reading, not
//   paired surface/bottom DO or temperature -- there's no data to detect it
//   from. Would need a data-model change (depth-paired readings), not an
//   algorithm.
// - Muscle necrosis / poor FCR trending: both need growth or feed-intake
//   records this app doesn't collect at all (Analysis has no weight/feed
//   field).
// - AHPND/WSSV risk: these are pathogen-driven diseases. Inferring viral or
//   bacterial disease risk from water chemistry trends alone -- with no
//   pathology or PCR data -- would be a real overreach for a tool whose
//   whole premise is not overclaiming. Diagnosing disease risk needs
//   diagnostic testing, not a chemistry trend.
//
// What IS legitimately supportable from data this app already collects:
// noticing that DO/TAN/nitrite are trending toward a documented failure
// mode across consecutive readings, even before crossing the acute
// threshold that matchFailureModes.ts checks on a single reading. This is
// a real, useful early-warning signal that doesn't require inventing
// biology the app has no data for.
//
// The "3 consecutive readings in the same direction" rule itself is a
// disclosed engineering heuristic (a standard quality-control trend-
// detection pattern), not a number cited from the guide -- same disclosure
// pattern as the staged-dosing safety margin in stagedDosing.ts.

import type { Analysis, Anomaly, WaterParameters } from "../types";
import { DO_CRASH_THRESHOLD_MGL, TAN_TOXICITY_THRESHOLD_MGL, NITRITE_TOXICITY_THRESHOLD_MGL } from "../data/failureModes";

const MIN_READINGS_FOR_TREND = 3;

interface TrendFieldConfig {
  field: keyof WaterParameters;
  label: string;
  direction: "rising-is-dangerous" | "falling-is-dangerous";
  acuteThresholdMgL: number;
}

const TREND_FIELDS: TrendFieldConfig[] = [
  { field: "doMgL", label: "Dissolved oxygen", direction: "falling-is-dangerous", acuteThresholdMgL: DO_CRASH_THRESHOLD_MGL },
  { field: "tanMgL", label: "Total ammonia nitrogen", direction: "rising-is-dangerous", acuteThresholdMgL: TAN_TOXICITY_THRESHOLD_MGL },
  { field: "nitriteMgL", label: "Nitrite-nitrogen", direction: "rising-is-dangerous", acuteThresholdMgL: NITRITE_TOXICITY_THRESHOLD_MGL },
];

function isMonotonic(values: number[], direction: "rising-is-dangerous" | "falling-is-dangerous"): boolean {
  for (let i = 1; i < values.length; i++) {
    if (direction === "rising-is-dangerous" && values[i] <= values[i - 1]) return false;
    if (direction === "falling-is-dangerous" && values[i] >= values[i - 1]) return false;
  }
  return true;
}

/**
 * Detects a worsening trajectory across a site's most recent analyses for
 * DO, TAN, and nitrite -- an early-warning signal distinct from
 * matchFailureModes.ts, which only looks at a single reading against its
 * acute threshold. Only fires while the latest reading is STILL below the
 * acute threshold (once it crosses, matchFailureModes.ts already covers it
 * -- this function's whole purpose is the gap before that point).
 */
export function detectTrends(history: Analysis[]): Anomaly[] {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const anomalies: Anomaly[] = [];

  for (const config of TREND_FIELDS) {
    const readings = sorted
      .map((a) => ({ date: a.date, value: a.parameters[config.field] as number | undefined }))
      .filter((r): r is { date: string; value: number } => r.value !== undefined);

    if (readings.length < MIN_READINGS_FOR_TREND) continue;

    const lastN = readings.slice(-MIN_READINGS_FOR_TREND);
    const values = lastN.map((r) => r.value);
    const latest = values[values.length - 1];

    const alreadyAcute =
      config.direction === "falling-is-dangerous" ? latest < config.acuteThresholdMgL : latest >= config.acuteThresholdMgL;
    if (alreadyAcute) continue; // matchFailureModes.ts already covers this reading

    if (isMonotonic(values, config.direction)) {
      const trajectory = lastN.map((r) => `${r.value} mg/L (${r.date})`).join(" -> ");
      anomalies.push({
        message: `${config.label} has moved in the same worsening direction across the last ${MIN_READINGS_FOR_TREND} readings: ${trajectory}. Still below the acute threshold, but the trend itself is the warning sign -- worth investigating the root cause now rather than waiting for a crossing.`,
        severity: "watch",
      });
    }
  }

  return anomalies;
}
