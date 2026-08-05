// src/lib/data/failureModes.ts
//
// Source: Chapter 7 -- Failure Mode Library. Sections 3 (Dissolved Oxygen
// Crash), 4 (Ammonia Toxicity), 5 (Nitrite Toxicity), 6 (Molt Failure and
// Soft Shell). ~/Desktop/water management guide/Chapter-7-Failure-Mode-Library-SOP.md
// Molt-failure threshold cross-referenced from Chapter 6 §2.
//
// DO/ammonia/nitrite were identified as a real gap during field-testing,
// 2026-08-05 -- the guide documents all three with real thresholds already
// cited elsewhere in this codebase's own research, but none were wired into
// the failure-mode matcher. Each uses the guide's own flat, salinity-
// independent thresholds where given (DO, the immune-suppression nitrite
// point) rather than a fuller pH/temperature/salinity-adjusted model this
// pass didn't have time to verify carefully -- see each entry's comment.

import type { FailureMode } from "../types";

export const FAILURE_MODES: FailureMode[] = [
  {
    id: "dissolved-oxygen-crash",
    symptomPattern:
      "Shrimp gasping at the surface, crowding along pond edges, most often noticed in the hour or two before dawn.",
    relatedParameters: ["doMgL"],
    diagnosis:
      "Dissolved oxygen has crashed below the point shrimp can tolerate. DO falls overnight as phytoplankton switch from producing to consuming oxygen; in a heavily loaded system it can fall from supersaturated at sunset to below 2 mg/L before sunrise. Below 2 mg/L, mass mortality can follow within 1-2 hours if not corrected. A single midday reading will not catch this — midday readings after a night crash often look completely normal.",
    correctiveSteps: [
      "Take the actual dawn reading (just before sunrise), not a midday one (Ch.7 §3).",
      "Run aeration through the night, not just during the day — most crashes are a night-time problem invisible to daytime-only testing.",
      "Target a working range of 3-10 mg/L, roughly 6 mg/L as a comfortable optimum.",
      "After heavy rain, increase mixing — stratification is a common trigger for an unusually severe crash (Ch.7 §9).",
    ],
    sourceCitation: "Water Management Guide Ch.7 §3",
    severity: "critical",
  },
  {
    id: "ammonia-toxicity",
    symptomPattern:
      "Reduced appetite, lethargy, gill damage visible on close inspection, slowed growth, and in severe cases direct mortality.",
    relatedParameters: ["tanMgL"],
    diagnosis:
      "Total ammonia nitrogen (TAN) exists as a relatively harmless ionized form (NH4+) and a genuinely toxic un-ionized form (NH3); higher pH and temperature both push more of the total into the toxic form. This match uses a flat, salinity-independent TAN threshold rather than the full pH/temperature-adjusted un-ionized fraction (a real, more precise model exists in the literature but wasn't verified carefully enough to ship this pass) -- treat this as a conservative screen, not the guide's full picture.",
    correctiveSteps: [
      "Reduce feed load if TAN is trending up — overfeeding is the most common root cause (Ch.7 §4).",
      "Address pH swings, not just the ammonia number — high pH converts the same ammonia load into more toxic un-ionized ammonia.",
      "In low-salinity systems, remember ammonia tolerance is somewhat reduced versus full-strength seawater.",
      "Test total ammonia alongside pH and temperature at the same time — the total number alone tells you little without those two.",
    ],
    sourceCitation: "Water Management Guide Ch.7 §4",
    severity: "critical",
  },
  {
    id: "nitrite-toxicity",
    symptomPattern:
      "Lethargy, reduced feeding, slowed growth — overlaps heavily with ammonia toxicity. Most often in an established pond partway through the cycle, especially after a nitrogen-cycle disruption (large water exchange, sudden feed increase, biofloc crash).",
    relatedParameters: ["nitriteMgL", "chlorideMgL"],
    diagnosis:
      "Nitrite toxicity is overwhelmingly governed by salinity/chloride — chloride ions competitively block nitrite uptake at the gill, so more chloride means more nitrite tolerance. Published 96-hour lethal thresholds for L. vannamei juveniles run from ~5.7 mg/L nitrite-N at 0.6 ppt up to ~76.5 mg/L at 15 ppt, more than tenfold, driven almost entirely by chloride availability. Damage doesn't wait for the lethal threshold either — nitrite at 5 mg/L and above has been shown to suppress immune function (reduced hemocyte counts and phenoloxidase activity), leaving surviving shrimp more vulnerable to Vibrio infection.",
    correctiveSteps: [
      "In the 1-5 ppt band, keep nitrite-nitrogen below roughly 0.6-1 mg/L as a standing target (Ch.6 §3).",
      "If chloride is already at the Ch.3 target ratio for your salinity, you have real protective margin — a source that tested low on chloride during Ch.2 screening is exactly what turns an ordinary nitrite fluctuation into a crisis.",
      "Don't wait for a visible symptom — the immune-suppression effect happens below the level that causes obvious sickness.",
    ],
    sourceCitation: "Water Management Guide Ch.7 §5",
    severity: "critical",
  },
  {
    id: "molt-failure-soft-shell",
    symptomPattern:
      "Shrimp failing to harden new shell after molting; wrinkled/soft shells; mortality clustering around molt events rather than spread evenly through the cycle.",
    relatedParameters: ["potassiumMgL", "magnesiumMgL", "calciumMgL", "alkalinityMgL"],
    diagnosis:
      "Mineral-availability problem, not disease — molting and shell-hardening depend on K/Mg/Ca being available in roughly the right proportion to sodium, and on adequate alkalinity. Inland groundwater is commonly K-deficient even when it reads 'hard' on a basic test, because hardness is often driven almost entirely by calcium.",
    correctiveSteps: [
      "Test potassium, magnesium, calcium, and alkalinity directly rather than assuming a salinity reading covers it (Ch.7 §6).",
      "Dose KCl to bring pond K+ past the documented 10 mg/L failure point and into the 20-30 mg/L adequate range at minimum (Ch.6 §2).",
      "Confirm magnesium independently rather than inferring it from a hardness reading (Ch.6 §6, 'The Hardness-Looks-Fine Trap').",
    ],
    sourceCitation: "Water Management Guide Ch.7 §6; Ch.6 §2 and §6",
    // A molt-failure match is an action-level problem by definition — it
    // means active, ongoing mortality, not a preventive watch item.
    severity: "action",
  },
];

// Documented failure point (Ch.6 §2): K+ < 10 mg/L is associated with molt
// failure, soft shell, and elevated mortality during ecdysis.
export const POTASSIUM_MOLT_FAILURE_THRESHOLD_MGL = 10;

// Ch.7 §3: below 2 mg/L, shrimp behaviour changes within a short window and
// mass mortality can follow within 1-2 hours.
export const DO_CRASH_THRESHOLD_MGL = 2;

// Flat, salinity-independent TAN threshold -- see failure-mode diagnosis
// comment above for why this is a conservative screen, not the guide's full
// pH/temperature-adjusted un-ionized-ammonia picture. 5.24 mg/L ammonia-N is
// the lowest concentration directly documented (via primary research) to
// cause significant mortality and measurable immune (phenoloxidase)
// suppression by day 7.
export const TAN_TOXICITY_THRESHOLD_MGL = 5;

// Ch.7 §5: nitrite at 5 mg/L and above suppresses immune function
// (reduced hemocyte counts and phenoloxidase activity), independent of the
// salinity-banded lethal threshold, which is not modeled here.
export const NITRITE_TOXICITY_THRESHOLD_MGL = 5;
