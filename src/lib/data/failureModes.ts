// src/lib/data/failureModes.ts
//
// Source: Chapter 7 §6 — Molt Failure and Soft Shell
// ~/Desktop/water management guide/Chapter-7-Failure-Mode-Library-SOP.md
// Threshold cross-referenced from Chapter 6 §2 (Absolute Mineral Floor Table).

import type { FailureMode } from "../types";

export const FAILURE_MODES: FailureMode[] = [
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
  },
];

// Documented failure point (Ch.6 §2): K+ < 10 mg/L is associated with molt
// failure, soft shell, and elevated mortality during ecdysis.
export const POTASSIUM_MOLT_FAILURE_THRESHOLD_MGL = 10;
