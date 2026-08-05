# Water Advisor App — Design Spec

Date: 2026-08-05
Status: Approved, ready for implementation planning

## 1. Purpose

A personal, single-user reference tool that takes a water source analysis (brackish,
borewell, underground, or low-salinity source) plus one or more target species
(including IMTA combinations), and generates a diagnosis of what's wrong with the
water for that stocking plan and a corrective protocol to fix it — with exact dosing
quantities for the operator's actual water volume.

Built on top of the existing Water Management Guide (`~/Desktop/water management
guide/`) — the guide's chapters, failure-mode library, and dosing logic become the
app's knowledge base rather than a document Hazem re-reads by hand each time.

Precedent: `~/PL-Advisor-App` (native Android, Kotlin/Compose/Room, Gemini chat with
context injection, pure-Kotlin `AdvisorEngine` separated from UI/AI). This app follows
the same separation-of-concerns philosophy — deterministic engine + AI chat layer — on
a different stack chosen to match this app's own constraints (web/PWA, local-first,
Claude API).

## 2. Architecture

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind. Deployed on Vercel.
  Configured as an installable PWA (manifest + service worker) so it adds to the phone
  home screen for field use.
- **Data storage**: Local-first. All sites, analyses, and history live in the browser's
  IndexedDB via Dexie.js. No backend database. Nothing about a user's specific pond
  data leaves the device.
- **AI proxy**: A single Vercel serverless API route (`/api/advisor`) holds the
  `ANTHROPIC_API_KEY` server-side and forwards two kinds of requests:
  1. Lab-report extraction (paste/upload → structured parameters)
  2. Follow-up chat on a completed diagnosis
  The API key never reaches the client. This is required even for a single-user app,
  because a deployed URL's network requests are inspectable regardless of who's
  expected to use it.
- **Knowledge base**: Bundled as versioned TypeScript/JSON data files shipped in the
  app's source tree (not a runtime database). Content changes are git commits, same
  as the guide itself. This keeps the diagnostic logic auditable and offline-capable —
  a diagnosis never depends on a live AI call succeeding.

## 3. Data model

All types below live in `src/lib/types.ts`. IndexedDB tables (Dexie) cover `Site` and
`Analysis`; everything else is static bundled data.

```ts
type SourceType = "borewell" | "brackish" | "underground" | "surface";

interface Site {
  id: string;
  name: string;
  location?: string;
  sourceType: SourceType;
  notes?: string;
  createdAt: string; // ISO date
}

interface WaterParameters {
  salinityPpt: number;
  sodiumMgL?: number;
  potassiumMgL?: number;
  calciumMgL?: number;
  magnesiumMgL?: number;
  chlorideMgL?: number;
  alkalinityMgL?: number;
  pH: number;
  hardnessMgL?: number;
  tdsMgL?: number;
  temperatureC?: number;
}

interface Analysis {
  id: string;
  siteId: string;
  date: string; // ISO date
  parameters: WaterParameters;
  targetSpeciesIds: string[]; // 1 = single-species, 2+ = IMTA
  volumeM3?: number; // pond/tank volume, used by the dosing calculator
  diagnosisSnapshot?: DiagnosisResult; // cached result of the engine run
  notes?: string;
}

type TrophicRole = "primary" | "extractive-filter" | "extractive-algae" | "decomposer";

interface SpeciesProfile {
  id: string;
  scientificName: string;
  commonName: string;
  category: "crustacean" | "fish" | "mollusc" | "algae" | "bacterial-consortium";
  trophicRole: TrophicRole;
  salinityToleranceRangePpt: [number, number];
  idealIonicRatios: Partial<Record<"Na:K" | "Mg:Ca" | "Na:Ca", number>>;
  sensitivityThresholds: {
    tanMgL?: [number, number];
    doMgL?: [number, number];
    phRange?: [number, number];
  };
  lifeStageNotes?: string;
  sourceCitation: string; // guide chapter or external source
}

interface ImtaCompatibilityRule {
  speciesIdA: string;
  speciesIdB: string;
  compatible: boolean;
  toleranceOverlapPpt: [number, number] | null;
  stockingRatioGuidance?: string;
  knownConflicts?: string;
  sourceCitation: string;
}

interface FailureMode {
  id: string;
  symptomPattern: string;
  relatedParameters: (keyof WaterParameters)[];
  diagnosis: string;
  correctiveSteps: string[];
  sourceCitation: string;
}

interface DosingRecipe {
  id: string;
  targetRatio: string; // e.g. "Na:K"
  amendmentCompound: string; // e.g. "Potassium chloride (KCl)"
  formula: string; // human-readable formula description
  calculate: (params: WaterParameters, volumeM3: number) => { compound: string; quantityKg: number }[];
}
```

## 4. Diagnostic engine

Pure TypeScript, no React/Next dependencies — lives in `src/lib/engine/` and is
unit-testable in isolation, mirroring `AdvisorEngine.kt`.

Flow (`runDiagnosis(analysis: Analysis): DiagnosisResult`):

1. **Source characterisation** — compare `parameters` against `sourceType`-specific
   expected norms (Chapter 2's decision tree), flag anomalies.
2. **Per-species compatibility check** — for each `targetSpeciesIds` entry, compare
   `parameters` against that species' `salinityToleranceRangePpt`,
   `idealIonicRatios`, and `sensitivityThresholds`; produce a per-species risk score
   and list of specific deviations.
3. **IMTA cross-check** — only runs when `targetSpeciesIds.length > 1`. Looks up
   `ImtaCompatibilityRule` for every species pair, surfaces tolerance-overlap
   conflicts and stocking guidance.
4. **Failure-mode matching** — deviations found in steps 1–3 are matched against
   `FailureMode.relatedParameters` to attach a named diagnosis and citation rather
   than a bare "value out of range."
5. **Corrective protocol assembly** — for each matched failure mode, pull
   `correctiveSteps`; where a `DosingRecipe` applies, run its `calculate()` against
   the analysis's `parameters` and `volumeM3` to produce exact amendment quantities.

Output type:

```ts
interface DiagnosisResult {
  sourceAnomalies: string[];
  perSpecies: Record<string, { riskLevel: "low" | "moderate" | "high"; deviations: string[] }>;
  imtaNotes: string[];
  matchedFailureModes: FailureMode[];
  dosingPlan: { compound: string; quantityKg: number; forParameter: string }[];
}
```

This result is deterministic and requires no network call. It is then optionally
handed to the AI chat layer as context.

## 5. AI chat layer

- Client calls `/api/advisor` with `{ diagnosis: DiagnosisResult, analysis: Analysis, speciesProfiles: SpeciesProfile[], userMessage: string }`.
- Server route builds a system prompt injecting the diagnosis, relevant species
  profiles, and relevant guide excerpts (bundled as markdown, loaded server-side),
  then calls the Claude API and streams the response back.
- Chat is scoped to one diagnosis at a time — no cross-analysis memory, keeping the
  prompt small and answers grounded in the specific case at hand.
- Same route (different mode) handles lab-report extraction: raw pasted/uploaded
  text goes in, a structured `WaterParameters` object comes back for the user to
  review and correct in the form before running the engine.

## 6. Screens

- **Home** — list of saved sites, "New Analysis" action.
- **Site detail** — analysis history for that site, parameter trend view over time.
- **New Analysis** — source type select → parameter entry (manual form, or
  paste/upload triggering AI extraction with the form pre-filled for review) →
  species/IMTA picker (multi-select from the species knowledge base) → pond volume
  input → Run Diagnosis.
- **Diagnosis Report** — source anomalies, per-species risk cards, IMTA compatibility
  notes, matched failure modes with citations, dosing plan table (recalculates live
  if volume is edited).
- **AI Chat** — contextual follow-up chat tied to the open diagnosis.
- **Knowledge Base browser** — species profiles and failure-mode library, browsable
  directly as a standalone reference even without running a diagnosis.

## 7. V1 knowledge base content scope

- **Vannamei** — fully populated from the Water Management Guide (all 14 chapters,
  failure-mode library, dosing logic already exist as source material).
- **Co-species for IMTA v1**: Nile/red tilapia, Gracilaria/Ulva seaweed, bivalves
  (oysters/clams/mussels), and the biofloc bacterial consortia already researched in
  Chapters 8 and 11. These are researched and populated as part of this build (new
  research, not yet in the guide) — same rigor standard as the guide: every
  quantitative claim traced to a named, checkable source, logged in a stress-test/
  cross-check log the same way the guide's was.
- Schema (Section 3) is species-agnostic — adding a new species post-v1 is a data
  addition, not a code change.

## 8. Testing

- Engine (`src/lib/engine/`) gets unit tests against known cases pulled directly from
  the guide's own worked examples — e.g. Chapter 6's zero-salinity acclimation
  protocol, Chapter 7's failure-mode cases — so the engine's output is checked
  against the source material it's derived from, not just internal consistency.
- Dosing calculator functions get unit tests with hand-verified arithmetic (known
  input parameters + volume → known correct quantity).
- No E2E/UI test suite for v1 given single-user scope; manual verification is
  sufficient at this stage.

## 9. Out of scope for v1

- Multi-device sync (local-first only; revisit if the on-device-only limitation
  becomes a real friction point).
- Client-facing/productised version of this tool (this is an internal instrument;
  a future commercial spinoff would be a separate design).
- Species beyond the V1 list — added incrementally as real jobs require them.
- Cost-to-fix estimation (dosing quantities only, no pricing layer, unlike
  PL-Advisor's RegionProfile pattern) — can be added later without a schema change
  if it becomes useful.
