# Water Advisor App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user Next.js PWA that diagnoses a water source (borewell/brackish/underground/low-salinity) against one or more target species (including IMTA combinations) and produces a corrective protocol with exact dosing quantities, grounded in the Water Management Guide at `~/Desktop/water management guide/`.

**Architecture:** Local-first PWA (Next.js + IndexedDB via Dexie), a pure-TypeScript deterministic diagnostic engine separate from the UI, and a single Vercel serverless route proxying Claude API calls for lab-report extraction and follow-up chat. Knowledge base is bundled, versioned TypeScript data — not a runtime database.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Dexie.js (IndexedDB), Vitest + fake-indexeddb for testing, Anthropic SDK (`@anthropic-ai/sdk`), deployed on Vercel.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-05-water-diagnostic-app-design.md` — every task below implements a section of it.
- No backend database. All site/analysis data stays in the browser (IndexedDB). Only the AI proxy route runs server-side, and it is stateless (no data persisted server-side).
- `ANTHROPIC_API_KEY` lives only in Vercel environment variables / local `.env.local`, never in client code or committed files.
- Every quantitative figure in knowledge-base data (`src/lib/data/`) must carry a source citation as a code comment, matching the guide's own citation-discipline standard. Do not invent numbers — if a figure isn't in the guide or another checkable source, leave the field unset (it's optional in the type) rather than filling it with a guess.
- **Scoping note carried over from planning:** `WaterParameters` (per spec Section 3) does not include iron, manganese, H₂S, or arsenic, even though Chapter 2 of the guide screens for them. V1's `sourceCharacterization` step is therefore scoped to salinity banding and the red-flag checks that map onto fields `WaterParameters` actually has (hardness/alkalinity mismatch, K⁺, Mg²⁺, Cl⁻). Extending `WaterParameters` to cover the full 20-parameter panel is out of scope for this plan — flag it as a fast-follow if it turns out to matter in practice.
- **Known gap in the source material:** the guide's Chapter 2 §4 decision tree has no explicit terminal node for the 5–10 ppt salinity band (its "No" branch after the 1–5 ppt check only resolves the <1 ppt case, not the 5–10 ppt case). `classifySourceBySalinity` (Task 4) returns an honest `"unclassified-gap"` result for that band rather than silently assigning it to a chapter the source document doesn't actually route it to.

---

## File Structure

```
Water-Advisor-App/
├── package.json, tsconfig.json, next.config.ts, tailwind.config.ts,
│   postcss.config.mjs, vitest.config.ts, .gitignore, .env.example
├── public/manifest.json
├── src/
│   ├── app/
│   │   ├── layout.tsx, globals.css, page.tsx          # Home
│   │   ├── sites/[siteId]/page.tsx                    # Site detail
│   │   ├── analysis/new/page.tsx                      # New Analysis flow
│   │   ├── analysis/[analysisId]/page.tsx              # Diagnosis Report + chat
│   │   ├── knowledge-base/page.tsx                     # KB browser
│   │   └── api/advisor/route.ts                        # AI proxy
│   ├── components/
│   │   ├── ParameterForm.tsx, SpeciesPicker.tsx,
│   │   ├── DiagnosisReportView.tsx, ChatPanel.tsx, SiteList.tsx
│   └── lib/
│       ├── types.ts
│       ├── db.ts
│       ├── data/
│       │   ├── sourceNorms.ts, species.ts, imtaRules.ts,
│       │   │   failureModes.ts, dosingRecipes.ts
│       └── engine/
│           ├── sourceCharacterization.ts, speciesCompatibility.ts,
│           │   imtaCompatibility.ts, failureModeMatching.ts,
│           │   dosingCalculator.ts, runDiagnosis.ts
```

Tests are colocated: `foo.ts` ships alongside `foo.test.ts` in the same directory. This keeps each engine/data module and its verification together, matching the existing guide's file-per-concern organisation.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `public/manifest.json`

**Interfaces:**
- Produces: a working Next.js + TypeScript + Tailwind + Vitest project that `npm run build` and `npm run test` both succeed on, with nothing else implemented yet.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "water-advisor-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "dexie": "^4.0.8",
    "dexie-react-hooks": "^1.1.7",
    "@anthropic-ai/sdk": "^0.32.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0",
    "fake-indexeddb": "^6.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`**

```ts
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

```js
// postcss.config.mjs
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

- [ ] **Step 5: Write `.gitignore` and `.env.example`**

```
# .gitignore
node_modules/
.next/
.env.local
*.tsbuildinfo
```

```
# .env.example
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 6: Write app shell**

```tsx
// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Water Advisor",
  description: "Water source diagnosis and corrective protocols for aquaculture stocking plans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```tsx
// src/app/page.tsx
export default function HomePage() {
  return <main className="p-6">Water Advisor — scaffold placeholder, replaced in Task 12.</main>;
}
```

- [ ] **Step 7: Write `public/manifest.json`**

```json
{
  "name": "Water Advisor",
  "short_name": "WaterAdvisor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": []
}
```

(Icon files are added in Task 17, once there's an actual UI to theme icons around.)

- [ ] **Step 8: Install and verify**

Run: `npm install && npm run build`
Expected: build succeeds with the single placeholder route compiled.

Run: `npm run test`
Expected: passes (no test files yet — Vitest exits 0 with "no test files found" or equivalent; this is expected at this stage).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest project"
```

---

### Task 2: Core types module

**Files:**
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `SourceType`, `WaterParameters`, `Site`, `Analysis`, `TrophicRole`, `SpeciesProfile`, `ImtaCompatibilityRule`, `FailureMode`, `DosingRecipe`, `DiagnosisResult` — the shared vocabulary every later task imports from `@/lib/types`.

- [ ] **Step 1: Write the types file**

```ts
// src/lib/types.ts

export type SourceType = "borewell" | "brackish" | "underground" | "surface";

export interface WaterParameters {
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

export interface Site {
  id: string;
  name: string;
  location?: string;
  sourceType: SourceType;
  notes?: string;
  createdAt: string; // ISO date
}

export interface Analysis {
  id: string;
  siteId: string;
  date: string; // ISO date
  parameters: WaterParameters;
  targetSpeciesIds: string[]; // 1 = single-species, 2+ = IMTA
  volumeM3?: number;
  diagnosisSnapshot?: DiagnosisResult;
  notes?: string;
}

export type TrophicRole = "primary" | "extractive-filter" | "extractive-algae" | "decomposer";

export interface SpeciesProfile {
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
  sourceCitation: string;
}

export interface ImtaCompatibilityRule {
  speciesIdA: string;
  speciesIdB: string;
  compatible: boolean;
  toleranceOverlapPpt: [number, number] | null;
  stockingRatioGuidance?: string;
  knownConflicts?: string;
  sourceCitation: string;
}

export interface FailureMode {
  id: string;
  symptomPattern: string;
  relatedParameters: (keyof WaterParameters)[];
  diagnosis: string;
  correctiveSteps: string[];
  sourceCitation: string;
}

export interface DosingRecipe {
  id: string;
  targetRatio: string;
  amendmentCompound: string;
  formula: string;
  calculate: (
    params: WaterParameters,
    volumeM3: number
  ) => { compound: string; quantityKg: number }[];
}

export interface DiagnosisResult {
  sourceAnomalies: string[];
  perSpecies: Record<string, { riskLevel: "low" | "moderate" | "high"; deviations: string[] }>;
  imtaNotes: string[];
  matchedFailureModes: FailureMode[];
  dosingPlan: { compound: string; quantityKg: number; forParameter: string }[];
}
```

- [ ] **Step 2: Verify it type-checks in isolation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 3: Dexie database layer

**Files:**
- Create: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: `Site`, `Analysis` from `@/lib/types`
- Produces: `db` (Dexie instance), `db.sites`, `db.analyses` tables; `createSite(input: Omit<Site, "id" | "createdAt">): Promise<Site>`; `saveAnalysis(analysis: Analysis): Promise<void>`; `getAnalysesForSite(siteId: string): Promise<Analysis[]>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db.test.ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db, createSite, saveAnalysis, getAnalysesForSite } from "./db";

describe("db", () => {
  beforeEach(async () => {
    await db.sites.clear();
    await db.analyses.clear();
  });

  it("creates a site with a generated id and createdAt", async () => {
    const site = await createSite({ name: "Nalgonda Well 3", sourceType: "borewell" });
    expect(site.id).toBeTruthy();
    expect(site.createdAt).toBeTruthy();
    const stored = await db.sites.get(site.id);
    expect(stored?.name).toBe("Nalgonda Well 3");
  });

  it("saves and retrieves analyses scoped to a site", async () => {
    const site = await createSite({ name: "Well A", sourceType: "borewell" });
    const otherSite = await createSite({ name: "Well B", sourceType: "borewell" });
    await saveAnalysis({
      id: "a1",
      siteId: site.id,
      date: "2026-08-05",
      parameters: { salinityPpt: 2, pH: 7.5 },
      targetSpeciesIds: [],
    });
    await saveAnalysis({
      id: "a2",
      siteId: otherSite.id,
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8 },
      targetSpeciesIds: [],
    });

    const results = await getAnalysesForSite(site.id);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db.test.ts`
Expected: FAIL — `./db` module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/db.ts
import Dexie, { type EntityTable } from "dexie";
import type { Site, Analysis } from "./types";

export const db = new Dexie("WaterAdvisorDB") as Dexie & {
  sites: EntityTable<Site, "id">;
  analyses: EntityTable<Analysis, "id">;
};

db.version(1).stores({
  sites: "id, name, sourceType, createdAt",
  analyses: "id, siteId, date",
});

export async function createSite(input: Omit<Site, "id" | "createdAt">): Promise<Site> {
  const site: Site = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await db.sites.add(site);
  return site;
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  await db.analyses.put(analysis);
}

export async function getAnalysesForSite(siteId: string): Promise<Analysis[]> {
  return db.analyses.where("siteId").equals(siteId).toArray();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/db.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts src/lib/db.test.ts
git commit -m "feat: add Dexie local-first database layer for sites and analyses"
```

---

### Task 4: Source norms data + source characterization engine step

This is the engine's Step 1 (spec Section 4). Grounded directly in Chapter 2 of the guide (`~/Desktop/water management guide/Chapter-2-Borewell-Water-Characterisation-SOP.md`), Sections 3 and 4.

**Files:**
- Create: `src/lib/data/sourceNorms.ts`
- Create: `src/lib/engine/sourceCharacterization.ts`
- Test: `src/lib/engine/sourceCharacterization.test.ts`

**Interfaces:**
- Consumes: `WaterParameters`, `SourceType` from `@/lib/types`
- Produces: `classifySourceBySalinity(salinityPpt: number): SalinityClassification`; `checkSourceRedFlags(params: WaterParameters): string[]`; `characterizeSource(params: WaterParameters): string[]` (the function `runDiagnosis`, Task 10, calls for `DiagnosisResult.sourceAnomalies`)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/engine/sourceCharacterization.test.ts
import { describe, it, expect } from "vitest";
import { classifySourceBySalinity, checkSourceRedFlags, characterizeSource } from "./sourceCharacterization";
import type { WaterParameters } from "../types";

describe("classifySourceBySalinity", () => {
  it("flags salinity at or above 30 ppt as hypersaline, routed to Ch.10", () => {
    const result = classifySourceBySalinity(32);
    expect(result.band).toBe("hypersaline");
    expect(result.routeToChapter).toContain("Ch.10");
  });

  it("routes 10-<30 ppt to the standard synthetic seawater build (Ch.3)", () => {
    const result = classifySourceBySalinity(15);
    expect(result.band).toBe("standard-10-25");
    expect(result.routeToChapter).toContain("Ch.3");
  });

  it("routes 1-5 ppt to the ultra-low salinity protocol (Ch.6)", () => {
    const result = classifySourceBySalinity(2);
    expect(result.band).toBe("ultra-low-1-5");
    expect(result.routeToChapter).toContain("Ch.6");
  });

  it("flags below 1 ppt as the zero-salinity edge case requiring senior review", () => {
    const result = classifySourceBySalinity(0.5);
    expect(result.band).toBe("zero-salinity-edge");
  });

  it("honestly reports the 5-10 ppt band as an unclassified gap in the source decision tree", () => {
    const result = classifySourceBySalinity(7);
    expect(result.band).toBe("unclassified-gap");
  });
});

describe("checkSourceRedFlags", () => {
  it("flags hardness more than 2x alkalinity as a Ca-dominant, non-buffering water", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, hardnessMgL: 300, alkalinityMgL: 100 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("Ca-dominant"))).toBe(true);
  });

  it("flags potassium below the 5 mg/L watch line", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, potassiumMgL: 3 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("potassium") && f.includes("watch"))).toBe(true);
  });

  it("flags potassium below the 2 mg/L action trigger with higher severity language", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, potassiumMgL: 1 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("potassium") && f.includes("mandatory fortification"))).toBe(true);
  });

  it("flags chloride below 300 mg/L at low salinity (<5 ppt) per the nitrite-protection floor", () => {
    const params: WaterParameters = { salinityPpt: 2, pH: 7.5, chlorideMgL: 200 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("chloride"))).toBe(true);
  });

  it("does not flag chloride at 10 ppt where the low-salinity floor doesn't apply", () => {
    const params: WaterParameters = { salinityPpt: 10, pH: 7.8, chlorideMgL: 200 };
    const flags = checkSourceRedFlags(params);
    expect(flags.some((f) => f.includes("chloride"))).toBe(false);
  });
});

describe("characterizeSource", () => {
  it("combines salinity banding and red flags using the Nalgonda worked example (Ch.6 Section 8)", () => {
    // Real district-mean profile from the guide's worked example.
    const params: WaterParameters = {
      salinityPpt: 2,
      tdsMgL: 1411,
      potassiumMgL: 8.4,
      magnesiumMgL: 92.3,
      chlorideMgL: 657,
      pH: 7.6,
    };
    const anomalies = characterizeSource(params);
    expect(anomalies.some((a) => a.includes("Ch.6"))).toBe(true);
    // K+ at 8.4 mg/L clears the 5 mg/L watch line but the chapter warns individual
    // wells can run much lower — no watch flag should fire at this specific value.
    expect(anomalies.some((a) => a.includes("potassium"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/engine/sourceCharacterization.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write `src/lib/data/sourceNorms.ts`**

```ts
// src/lib/data/sourceNorms.ts
//
// Source: Chapter 2 — Borewell Water Characterisation, Sections 3 and 4.
// ~/Desktop/water management guide/Chapter-2-Borewell-Water-Characterisation-SOP.md

export interface SalinityClassification {
  band:
    | "hypersaline"
    | "standard-10-25"
    | "ultra-low-1-5"
    | "zero-salinity-edge"
    | "unclassified-gap";
  routeToChapter: string;
  note: string;
}

/**
 * Ch.2 §4 decision tree. The tree's "No" branch after the 1-5 ppt check only
 * resolves the <1 ppt case explicitly — 5-10 ppt has no terminal node in the
 * source document, so it's reported as a gap rather than assigned a chapter
 * the guide doesn't actually route it to.
 */
export function classifySourceBySalinity(salinityPpt: number): SalinityClassification {
  if (salinityPpt >= 30) {
    return {
      band: "hypersaline",
      routeToChapter: "Ch.10 (MENA/GCC Saline Groundwater)",
      note: "Naturally saline/hypersaline source. Problem is dilution and ratio correction, not fortification — do not add salt.",
    };
  }
  if (salinityPpt >= 10) {
    return {
      band: "standard-10-25",
      routeToChapter: "Ch.3 (Standard Synthetic Seawater Build)",
      note:
        salinityPpt >= 20
          ? "In the 20-30 ppt range common in Gulf/MENA aquifers — check Ch.10 first, ratio correction may matter more than addition volume."
          : "Standard 10-25 ppt synthetic seawater build applies.",
    };
  }
  if (salinityPpt >= 1 && salinityPpt < 5) {
    return {
      band: "ultra-low-1-5",
      routeToChapter: "Ch.6 (Ultra-Low & Zero-Salinity Systems)",
      note: "Check absolute K+/Mg2+/Cl- floors, not ratio dilution alone.",
    };
  }
  if (salinityPpt < 1) {
    return {
      band: "zero-salinity-edge",
      routeToChapter: "senior review required",
      note: "Zero-salinity edge case. Requires full ionic reconstruction; near-total synthetic build, highest mineral cost/ton.",
    };
  }
  return {
    band: "unclassified-gap",
    routeToChapter: "none — gap in Ch.2 §4 decision tree",
    note: "5-10 ppt has no explicit terminal node in the source guide's decision tree. Treat with the same rigor as the nearest documented band (Ch.3 or Ch.6) until this gap is resolved in the guide itself.",
  };
}

// Ch.2 §3 Red-Flag Threshold Table — only rows that map onto fields present
// in WaterParameters (Fe/Mn/H2S/arsenic are out of scope, see plan's Global Constraints).
export const RED_FLAG_THRESHOLDS = {
  hardnessToAlkalinityWatchRatio: 2,
  hardnessToAlkalinityActionRatio: 3,
  potassiumWatchMgL: 5,
  potassiumActionMgL: 2,
  magnesiumFloorAtStandardSalinityMgL: 10, // at >=10 ppt target
  magnesiumFloorAtLowSalinityMgL: 3, // at 1-5 ppt target
  chlorideWatchMgLAtLowSalinity: 300, // salinity < 5 ppt
  chlorideActionMgLAtLowSalinity: 150,
} as const;
```

- [ ] **Step 4: Write `src/lib/engine/sourceCharacterization.ts`**

```ts
// src/lib/engine/sourceCharacterization.ts
import type { WaterParameters } from "../types";
import { classifySourceBySalinity, RED_FLAG_THRESHOLDS } from "../data/sourceNorms";

export { classifySourceBySalinity };

export function checkSourceRedFlags(params: WaterParameters): string[] {
  const flags: string[] = [];
  const t = RED_FLAG_THRESHOLDS;

  if (params.hardnessMgL !== undefined && params.alkalinityMgL !== undefined && params.alkalinityMgL > 0) {
    const ratio = params.hardnessMgL / params.alkalinityMgL;
    if (ratio > t.hardnessToAlkalinityActionRatio) {
      flags.push(
        `Hardness is more than ${t.hardnessToAlkalinityActionRatio}x alkalinity (${params.hardnessMgL}:${params.alkalinityMgL}) — Ca-dominant, non-buffering water. Do not assume "hard = mineral-rich."`
      );
    } else if (ratio > t.hardnessToAlkalinityWatchRatio) {
      flags.push(
        `Hardness is more than ${t.hardnessToAlkalinityWatchRatio}x alkalinity (${params.hardnessMgL}:${params.alkalinityMgL}) — watch for a Ca-dominant, non-buffering water.`
      );
    }
  }

  if (params.potassiumMgL !== undefined) {
    if (params.potassiumMgL < t.potassiumActionMgL) {
      flags.push(
        `potassium at ${params.potassiumMgL} mg/L is below the ${t.potassiumActionMgL} mg/L action trigger — mandatory fortification regardless of salinity band.`
      );
    } else if (params.potassiumMgL < t.potassiumWatchMgL) {
      flags.push(`potassium at ${params.potassiumMgL} mg/L is below the ${t.potassiumWatchMgL} mg/L watch line.`);
    }
  }

  if (params.chlorideMgL !== undefined && params.salinityPpt < 5) {
    if (params.chlorideMgL < t.chlorideActionMgLAtLowSalinity) {
      flags.push(
        `chloride at ${params.chlorideMgL} mg/L is below the ${t.chlorideActionMgLAtLowSalinity} mg/L action floor at this salinity — route to Ch.6 chloride:nitrite protocol before stocking.`
      );
    } else if (params.chlorideMgL < t.chlorideWatchMgLAtLowSalinity) {
      flags.push(
        `chloride at ${params.chlorideMgL} mg/L is below the ${t.chlorideWatchMgLAtLowSalinity} mg/L watch floor at low salinity — loss of nitrite-toxicity protection risk.`
      );
    }
  }

  return flags;
}

export function characterizeSource(params: WaterParameters): string[] {
  const classification = classifySourceBySalinity(params.salinityPpt);
  const anomalies = [`Salinity band: ${classification.band} — route to ${classification.routeToChapter}. ${classification.note}`];
  return anomalies.concat(checkSourceRedFlags(params));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/engine/sourceCharacterization.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/sourceNorms.ts src/lib/engine/sourceCharacterization.ts src/lib/engine/sourceCharacterization.test.ts
git commit -m "feat: add source characterization engine step (Ch.2 salinity bands + red flags)"
```

---

### Task 5: Vannamei species profile

**Files:**
- Create: `src/lib/data/species.ts`
- Test: `src/lib/data/species.test.ts`

**Interfaces:**
- Consumes: `SpeciesProfile` from `@/lib/types`
- Produces: `SPECIES: SpeciesProfile[]`; `getSpeciesById(id: string): SpeciesProfile | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/data/species.test.ts
import { describe, it, expect } from "vitest";
import { SPECIES, getSpeciesById } from "./species";

describe("species knowledge base", () => {
  it("includes a vannamei profile with the Ch.3 master ionic ratio", () => {
    const vannamei = getSpeciesById("vannamei");
    expect(vannamei).toBeDefined();
    // Ch.3 Part 2: Na:Mg:Ca:K = 27:3:1:1
    expect(vannamei?.idealIonicRatios["Na:K"]).toBe(27);
    expect(vannamei?.idealIonicRatios["Mg:Ca"]).toBe(3);
  });

  it("returns undefined for an unknown species id", () => {
    expect(getSpeciesById("nonexistent")).toBeUndefined();
  });

  it("every species profile carries a source citation", () => {
    for (const s of SPECIES) {
      expect(s.sourceCitation.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/species.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/data/species.ts
import type { SpeciesProfile } from "../types";

export const SPECIES: SpeciesProfile[] = [
  {
    id: "vannamei",
    scientificName: "Litopenaeus vannamei",
    commonName: "Whiteleg shrimp",
    category: "crustacean",
    trophicRole: "primary",
    // Synthesised from the guide's own stated operational scope: Ch.6 covers
    // 1-5 ppt ("ultra-low"), Ch.3 covers 10-25 ppt ("standard"), Ch.2 §4
    // routes >=30 ppt to Ch.10 (hypersaline). This is the guide's documented
    // operating envelope, not an independent literature claim.
    salinityToleranceRangePpt: [1, 30],
    idealIonicRatios: {
      // Ch.3 Part 2: Na:Mg:Ca:K = 27:3:1:1 (calcium = 1 baseline)
      "Na:K": 27,
      "Mg:Ca": 3,
      "Na:Ca": 27,
    },
    sensitivityThresholds: {
      // TAN and pH ranges are deliberately left unset: no specific target
      // range for either was located in the guide chapters reviewed while
      // building this profile (Ch.2, Ch.3, Ch.4, Ch.6, Ch.7). Populate once
      // sourced rather than guessing — see plan's citation-discipline
      // constraint.
    },
    lifeStageNotes:
      "PL acclimation (25-30 ppt hatchery to 1-5 ppt pond) must follow the Ch.6 §5 step-down schedule; direct transfer is a common, avoidable failure point.",
    sourceCitation:
      "Water Management Guide Ch.2 §4, Ch.3 Part 2 and Part 3, Ch.6 §1-2 and §5",
  },
];

export function getSpeciesById(id: string): SpeciesProfile | undefined {
  return SPECIES.find((s) => s.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/species.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/species.ts src/lib/data/species.test.ts
git commit -m "feat: add vannamei species profile grounded in the water management guide"
```

---

### Task 6: Species compatibility engine step

Engine Step 2 (spec Section 4).

**Files:**
- Create: `src/lib/engine/speciesCompatibility.ts`
- Test: `src/lib/engine/speciesCompatibility.test.ts`

**Interfaces:**
- Consumes: `WaterParameters`, `SpeciesProfile` from `@/lib/types`; `getSpeciesById` from `@/lib/data/species`
- Produces: `checkSpeciesCompatibility(params: WaterParameters, speciesIds: string[]): DiagnosisResult["perSpecies"]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/engine/speciesCompatibility.test.ts
import { describe, it, expect } from "vitest";
import { checkSpeciesCompatibility } from "./speciesCompatibility";
import type { WaterParameters } from "../types";

describe("checkSpeciesCompatibility", () => {
  it("flags high risk when salinity falls outside vannamei's tolerance range", () => {
    const params: WaterParameters = { salinityPpt: 0.3, pH: 7.5 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.riskLevel).toBe("high");
    expect(result.vannamei.deviations.some((d) => d.includes("salinity"))).toBe(true);
  });

  it("reports low risk with no deviations when salinity is within tolerance and no ionic data given", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.riskLevel).toBe("low");
  });

  it("flags Na:K ratio deviation from the Ch.3 target of 27 when ion data is available", () => {
    // Sodium far above target ratio relative to potassium (K critically low).
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, sodiumMgL: 4500, potassiumMgL: 20 };
    const result = checkSpeciesCompatibility(params, ["vannamei"]);
    expect(result.vannamei.deviations.some((d) => d.includes("Na:K"))).toBe(true);
  });

  it("skips unknown species ids without throwing", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = checkSpeciesCompatibility(params, ["unknown-species"]);
    expect(result["unknown-species"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/engine/speciesCompatibility.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/engine/speciesCompatibility.ts
import type { WaterParameters, DiagnosisResult } from "../types";
import { getSpeciesById } from "../data/species";

const RATIO_TOLERANCE_FRACTION = 0.25; // +/-25% of target ratio before flagging as a deviation

export function checkSpeciesCompatibility(
  params: WaterParameters,
  speciesIds: string[]
): DiagnosisResult["perSpecies"] {
  const result: DiagnosisResult["perSpecies"] = {};

  for (const id of speciesIds) {
    const species = getSpeciesById(id);
    if (!species) continue;

    const deviations: string[] = [];
    const [minPpt, maxPpt] = species.salinityToleranceRangePpt;
    if (params.salinityPpt < minPpt || params.salinityPpt > maxPpt) {
      deviations.push(
        `salinity ${params.salinityPpt} ppt is outside ${species.commonName}'s tolerance range of ${minPpt}-${maxPpt} ppt.`
      );
    }

    const targetNaK = species.idealIonicRatios["Na:K"];
    if (targetNaK !== undefined && params.sodiumMgL !== undefined && params.potassiumMgL) {
      const actualRatio = params.sodiumMgL / params.potassiumMgL;
      const deviationFraction = Math.abs(actualRatio - targetNaK) / targetNaK;
      if (deviationFraction > RATIO_TOLERANCE_FRACTION) {
        deviations.push(
          `Na:K ratio is ${actualRatio.toFixed(1)}:1, versus ${species.commonName}'s target of ${targetNaK}:1 (Ch.3 Part 2).`
        );
      }
    }

    const riskLevel: "low" | "moderate" | "high" =
      deviations.length === 0 ? "low" : deviations.length === 1 ? "moderate" : "high";

    // Salinity outside tolerance range is always high risk regardless of count.
    const outOfTolerance = params.salinityPpt < minPpt || params.salinityPpt > maxPpt;

    result[id] = {
      riskLevel: outOfTolerance ? "high" : riskLevel,
      deviations,
    };
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/engine/speciesCompatibility.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/speciesCompatibility.ts src/lib/engine/speciesCompatibility.test.ts
git commit -m "feat: add per-species compatibility engine step"
```

---

### Task 7: Dosing recipes + calculator

Engine Step 5 (spec Section 4). Grounded in Chapter 3 Part 4's worked KCl example.

**Files:**
- Create: `src/lib/data/dosingRecipes.ts`
- Test: `src/lib/data/dosingRecipes.test.ts`

**Interfaces:**
- Consumes: `DosingRecipe`, `WaterParameters` from `@/lib/types`
- Produces: `DOSING_RECIPES: DosingRecipe[]`; `calculatePotassiumDose(params: WaterParameters, volumeM3: number, targetMgL: number): { compound: string; quantityKg: number }[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/data/dosingRecipes.test.ts
import { describe, it, expect } from "vitest";
import { calculatePotassiumDose } from "./dosingRecipes";
import type { WaterParameters } from "../types";

describe("calculatePotassiumDose", () => {
  it("reproduces the guide's worked KCl example exactly (Ch.3 Part 4)", () => {
    // Source: K+ 8 mg/L, target 163 mg/L at 15 ppt -> shortfall 155 mg/L ->
    // 310 mg/L KCl (at ~50% K fraction) -> 3,100 kg over a 1 ha x 1 m pond
    // (10,000 m3).
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 };
    const result = calculatePotassiumDose(params, 10_000, 163);

    expect(result).toHaveLength(1);
    expect(result[0].compound).toBe("Potassium chloride (KCl)");
    expect(result[0].quantityKg).toBeCloseTo(3100, 0);
  });

  it("returns zero quantity when the source already meets the target", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8, potassiumMgL: 200 };
    const result = calculatePotassiumDose(params, 10_000, 163);
    expect(result[0].quantityKg).toBe(0);
  });

  it("treats missing source potassium data as zero potassium present", () => {
    const params: WaterParameters = { salinityPpt: 15, pH: 7.8 };
    const result = calculatePotassiumDose(params, 1000, 163);
    // shortfall 163 mg/L / 0.50 = 326 mg/L KCl; over 1000 m3: 326 * 1000 / 1000 = 326 kg
    expect(result[0].quantityKg).toBeCloseTo(326, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/dosingRecipes.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/data/dosingRecipes.ts
//
// Source: Chapter 3 Part 4 — "What to Add, and How Much"
// ~/Desktop/water management guide/Chapter-3-Standard-Synthetic-Seawater-Build-SOP.md

import type { DosingRecipe, WaterParameters } from "../types";

const KCL_POTASSIUM_FRACTION = 0.5; // KCl (muriate of potash) is ~50% potassium by weight

/**
 * mg/L shortfall -> kg for a given volume in m3.
 * 1 mg/L across a 1-hectare pond at 1m depth (10,000 m3 = 10,000,000 L) is
 * ~10 kg (Ch.3 Part 4). Per m3 that's 1 mg/L * 1000 L = 1000 mg = 0.001 kg,
 * i.e. multiply mg/L by volumeM3 and divide by 1000.
 */
function mgPerLShortfallToKg(shortfallMgL: number, volumeM3: number): number {
  return Math.max(0, shortfallMgL) * volumeM3 * 0.001;
}

export function calculatePotassiumDose(
  params: WaterParameters,
  volumeM3: number,
  targetMgL: number
): { compound: string; quantityKg: number }[] {
  const currentK = params.potassiumMgL ?? 0;
  const shortfall = targetMgL - currentK;
  const kclNeededMgL = Math.max(0, shortfall) / KCL_POTASSIUM_FRACTION;
  const quantityKg = mgPerLShortfallToKg(kclNeededMgL, volumeM3);

  return [{ compound: "Potassium chloride (KCl)", quantityKg: Math.round(quantityKg * 10) / 10 }];
}

export const DOSING_RECIPES: DosingRecipe[] = [
  {
    id: "kcl-potassium-correction",
    targetRatio: "K (absolute mg/L)",
    amendmentCompound: "Potassium chloride (KCl)",
    formula:
      "shortfall_mgL = target_mgL - current_mgL; KCl_mgL = shortfall_mgL / 0.50; quantity_kg = KCl_mgL * volume_m3 / 1000",
    calculate: (params, volumeM3) => calculatePotassiumDose(params, volumeM3, 163),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/dosingRecipes.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/dosingRecipes.ts src/lib/data/dosingRecipes.test.ts
git commit -m "feat: add dosing calculator, verified against the guide's worked KCl example"
```

---

### Task 8: Failure mode library + matching engine step

Engine Step 4 (spec Section 4). Grounded in Chapter 7 §6 (Molt Failure and Soft Shell), tied to the Ch.6 §2 potassium floor.

**Files:**
- Create: `src/lib/data/failureModes.ts`
- Create: `src/lib/engine/failureModeMatching.ts`
- Test: `src/lib/engine/failureModeMatching.test.ts`

**Interfaces:**
- Consumes: `FailureMode`, `WaterParameters` from `@/lib/types`
- Produces: `FAILURE_MODES: FailureMode[]`; `matchFailureModes(params: WaterParameters): FailureMode[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/engine/failureModeMatching.test.ts
import { describe, it, expect } from "vitest";
import { matchFailureModes } from "./failureModeMatching";

describe("matchFailureModes", () => {
  it("matches molt-failure/soft-shell when potassium is below the Ch.6 §2 documented failure point", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.5, potassiumMgL: 7 });
    expect(matches.some((m) => m.id === "molt-failure-soft-shell")).toBe(true);
  });

  it("does not match molt-failure when potassium is comfortably in the adequate range", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.5, potassiumMgL: 25 });
    expect(matches.some((m) => m.id === "molt-failure-soft-shell")).toBe(false);
  });

  it("returns an empty array when no related parameters are present", () => {
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8 });
    expect(matches).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/engine/failureModeMatching.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write `src/lib/data/failureModes.ts`**

```ts
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
```

- [ ] **Step 4: Write `src/lib/engine/failureModeMatching.ts`**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/engine/failureModeMatching.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/failureModes.ts src/lib/engine/failureModeMatching.ts src/lib/engine/failureModeMatching.test.ts
git commit -m "feat: add failure mode library and matching engine step"
```

---

### Task 9: IMTA compatibility engine step

Engine Step 3 (spec Section 4). V1 has only one populated species (vannamei), so the rule table is empty by design — this task builds the mechanism and proves it degrades correctly with zero or one species, ready for Task 18 to populate real cross-species rules.

**Files:**
- Create: `src/lib/data/imtaRules.ts`
- Create: `src/lib/engine/imtaCompatibility.ts`
- Test: `src/lib/engine/imtaCompatibility.test.ts`

**Interfaces:**
- Consumes: `ImtaCompatibilityRule` from `@/lib/types`
- Produces: `IMTA_RULES: ImtaCompatibilityRule[]`; `checkImtaCompatibility(speciesIds: string[]): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/engine/imtaCompatibility.test.ts
import { describe, it, expect } from "vitest";
import { checkImtaCompatibility } from "./imtaCompatibility";

describe("checkImtaCompatibility", () => {
  it("returns no notes for a single-species selection", () => {
    expect(checkImtaCompatibility(["vannamei"])).toEqual([]);
  });

  it("returns no notes for an empty selection", () => {
    expect(checkImtaCompatibility([])).toEqual([]);
  });

  it("reports an explicit 'no data' note for an unrecognised species pair rather than staying silent", () => {
    const notes = checkImtaCompatibility(["vannamei", "tilapia"]);
    expect(notes.some((n) => n.includes("no compatibility rule on file"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/engine/imtaCompatibility.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write `src/lib/data/imtaRules.ts`**

```ts
// src/lib/data/imtaRules.ts
//
// Empty in V1 — vannamei is the only fully-populated species profile.
// Populated in Task 18 once co-species (tilapia, seaweed, bivalves, biofloc
// consortia) are researched with the same citation rigor as the rest of the
// knowledge base.
import type { ImtaCompatibilityRule } from "../types";

export const IMTA_RULES: ImtaCompatibilityRule[] = [];
```

- [ ] **Step 4: Write `src/lib/engine/imtaCompatibility.ts`**

```ts
// src/lib/engine/imtaCompatibility.ts
import { IMTA_RULES } from "../data/imtaRules";

function findRule(speciesIdA: string, speciesIdB: string) {
  return IMTA_RULES.find(
    (r) =>
      (r.speciesIdA === speciesIdA && r.speciesIdB === speciesIdB) ||
      (r.speciesIdA === speciesIdB && r.speciesIdB === speciesIdA)
  );
}

export function checkImtaCompatibility(speciesIds: string[]): string[] {
  if (speciesIds.length < 2) return [];

  const notes: string[] = [];
  for (let i = 0; i < speciesIds.length; i++) {
    for (let j = i + 1; j < speciesIds.length; j++) {
      const a = speciesIds[i];
      const b = speciesIds[j];
      const rule = findRule(a, b);
      if (!rule) {
        notes.push(`${a} + ${b}: no compatibility rule on file yet — do not assume compatibility without checking manually.`);
        continue;
      }
      if (!rule.compatible) {
        notes.push(`${a} + ${b}: NOT compatible. ${rule.knownConflicts ?? ""}`.trim());
      } else {
        notes.push(
          `${a} + ${b}: compatible. ${rule.stockingRatioGuidance ?? ""}`.trim()
        );
      }
    }
  }
  return notes;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/engine/imtaCompatibility.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/imtaRules.ts src/lib/engine/imtaCompatibility.ts src/lib/engine/imtaCompatibility.test.ts
git commit -m "feat: add IMTA compatibility engine step (empty rule table, honest no-data reporting)"
```

---

### Task 10: runDiagnosis orchestrator

Wires Tasks 4, 6, 7, 8, 9 together into the full engine flow (spec Section 4, steps 1-5).

**Files:**
- Create: `src/lib/engine/runDiagnosis.ts`
- Test: `src/lib/engine/runDiagnosis.test.ts`

**Interfaces:**
- Consumes: `characterizeSource` (Task 4), `checkSpeciesCompatibility` (Task 6), `checkImtaCompatibility` (Task 9), `matchFailureModes` (Task 8), `DOSING_RECIPES` (Task 7), `Analysis`, `DiagnosisResult` from `@/lib/types`
- Produces: `runDiagnosis(analysis: Analysis): DiagnosisResult` — consumed by the UI in Tasks 13-14 and the AI proxy in Task 11.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/engine/runDiagnosis.test.ts
import { describe, it, expect } from "vitest";
import { runDiagnosis } from "./runDiagnosis";
import type { Analysis } from "../types";

describe("runDiagnosis", () => {
  it("produces a full diagnosis for the Nalgonda worked example (Ch.6 §8)", () => {
    const analysis: Analysis = {
      id: "test-1",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: {
        salinityPpt: 2,
        tdsMgL: 1411,
        potassiumMgL: 8.4,
        magnesiumMgL: 92.3,
        chlorideMgL: 657,
        pH: 7.6,
      },
      targetSpeciesIds: ["vannamei"],
      volumeM3: 10_000,
    };

    const result = runDiagnosis(analysis);

    expect(result.sourceAnomalies.length).toBeGreaterThan(0);
    expect(result.perSpecies.vannamei).toBeDefined();
    expect(result.imtaNotes).toEqual([]); // single species
    // K+ 8.4 mg/L is below the Ch.6 §2 molt-failure threshold of 10 mg/L.
    expect(result.matchedFailureModes.some((m) => m.id === "molt-failure-soft-shell")).toBe(true);
    expect(result.dosingPlan.length).toBeGreaterThan(0);
  });

  it("populates imtaNotes only when multiple species are selected", () => {
    const analysis: Analysis = {
      id: "test-2",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8 },
      targetSpeciesIds: ["vannamei", "tilapia"],
      volumeM3: 5000,
    };
    const result = runDiagnosis(analysis);
    expect(result.imtaNotes.length).toBeGreaterThan(0);
  });

  it("defaults dosing volume to 0 when volumeM3 is not provided, without throwing", () => {
    const analysis: Analysis = {
      id: "test-3",
      siteId: "site-1",
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8, potassiumMgL: 8 },
      targetSpeciesIds: ["vannamei"],
    };
    expect(() => runDiagnosis(analysis)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/engine/runDiagnosis.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/engine/runDiagnosis.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/engine/runDiagnosis.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full engine test suite together**

Run: `npx vitest run src/lib`
Expected: all prior tasks' tests still pass alongside this one (no regressions from wiring).

- [ ] **Step 6: Commit**

```bash
git add src/lib/engine/runDiagnosis.ts src/lib/engine/runDiagnosis.test.ts
git commit -m "feat: wire engine steps into runDiagnosis orchestrator"
```

---

### Task 11: AI proxy API route

Spec Section 5. Two modes: lab-report extraction and diagnosis follow-up chat.

**Files:**
- Create: `src/app/api/advisor/route.ts`
- Test: `src/app/api/advisor/route.test.ts`

**Interfaces:**
- Consumes: `DiagnosisResult`, `Analysis`, `SpeciesProfile`, `WaterParameters` from `@/lib/types`; `getSpeciesById` from `@/lib/data/species`; `@anthropic-ai/sdk`
- Produces: `POST /api/advisor` handling `{ mode: "extract", rawText: string }` → `{ parameters: Partial<WaterParameters> }`, and `{ mode: "chat", diagnosis: DiagnosisResult, analysis: Analysis, userMessage: string }` → `{ reply: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/advisor/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { POST } from "./route";
import type { Analysis, DiagnosisResult } from "@/lib/types";

describe("POST /api/advisor", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("rejects a request with an unrecognised mode", async () => {
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      body: JSON.stringify({ mode: "bogus" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns extracted parameters for mode 'extract'", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ salinityPpt: 2, pH: 7.6, potassiumMgL: 8.4 }) }],
    });
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      body: JSON.stringify({ mode: "extract", rawText: "Salinity: 2 ppt, pH 7.6, K+ 8.4 mg/L" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.parameters.salinityPpt).toBe(2);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns a chat reply for mode 'chat', with the diagnosis injected into the prompt", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "Here's why K+ matters..." }] });

    const analysis: Analysis = {
      id: "a1",
      siteId: "s1",
      date: "2026-08-05",
      parameters: { salinityPpt: 2, pH: 7.6, potassiumMgL: 8.4 },
      targetSpeciesIds: ["vannamei"],
    };
    const diagnosis: DiagnosisResult = {
      sourceAnomalies: ["Salinity band: ultra-low-1-5"],
      perSpecies: {},
      imtaNotes: [],
      matchedFailureModes: [],
      dosingPlan: [],
    };

    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      body: JSON.stringify({ mode: "chat", analysis, diagnosis, userMessage: "Why does K+ matter here?" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toContain("K+");
    const callArgs = mockCreate.mock.calls[0][0];
    expect(JSON.stringify(callArgs)).toContain("ultra-low-1-5");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/advisor/route.test.ts`
Expected: FAIL — route module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/api/advisor/route.ts
import Anthropic from "@anthropic-ai/sdk";
import type { Analysis, DiagnosisResult, WaterParameters } from "@/lib/types";
import { getSpeciesById } from "@/lib/data/species";

const MODEL = "claude-sonnet-4-5-20250929";

function extractText(message: { content: Array<{ type: string; text?: string }> }): string {
  const block = message.content.find((c) => c.type === "text");
  return block?.text ?? "";
}

async function handleExtract(client: Anthropic, rawText: string): Promise<Response> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract water quality parameters from this lab report text into a JSON object with keys from this list: salinityPpt, sodiumMgL, potassiumMgL, calciumMgL, magnesiumMgL, chlorideMgL, alkalinityMgL, pH, hardnessMgL, tdsMgL, temperatureC. Omit any key you can't find. Return only the JSON object, no other text.\n\n${rawText}`,
      },
    ],
  });

  const text = extractText(message);
  const parameters: Partial<WaterParameters> = JSON.parse(text);
  return Response.json({ parameters });
}

async function handleChat(
  client: Anthropic,
  analysis: Analysis,
  diagnosis: DiagnosisResult,
  userMessage: string
): Promise<Response> {
  const speciesContext = analysis.targetSpeciesIds
    .map((id) => getSpeciesById(id))
    .filter(Boolean)
    .map((s) => `${s!.commonName} (${s!.scientificName}): tolerance ${s!.salinityToleranceRangePpt.join("-")} ppt, source: ${s!.sourceCitation}`)
    .join("\n");

  const systemPrompt = `You are a water management advisor for aquaculture, grounded in the Blue Acres Methodology Water Management Guide. Answer using the diagnosis and species data below. Be specific and cite the source chapter when the diagnosis data includes one.

Analysis parameters: ${JSON.stringify(analysis.parameters)}
Diagnosis: ${JSON.stringify(diagnosis)}
Target species:
${speciesContext}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return Response.json({ reply: extractText(message) });
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const client = new Anthropic();

  if (body.mode === "extract") {
    return handleExtract(client, body.rawText);
  }
  if (body.mode === "chat") {
    return handleChat(client, body.analysis, body.diagnosis, body.userMessage);
  }
  return Response.json({ error: "unrecognised mode" }, { status: 400 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/advisor/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/advisor/route.ts src/app/api/advisor/route.test.ts
git commit -m "feat: add AI proxy route for lab-report extraction and diagnosis chat"
```

---

### Task 12: Home + site management UI

**Files:**
- Create: `src/components/SiteList.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/sites/[siteId]/page.tsx`

**Interfaces:**
- Consumes: `db`, `createSite`, `getAnalysesForSite` (Task 3); `Site`, `Analysis` from `@/lib/types`
- Produces: `<SiteList />` component; working Home and Site detail routes.

- [ ] **Step 1: Write `src/components/SiteList.tsx`**

```tsx
// src/components/SiteList.tsx
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db, createSite } from "@/lib/db";
import type { SourceType } from "@/lib/types";

const SOURCE_TYPES: SourceType[] = ["borewell", "brackish", "underground", "surface"];

export function SiteList() {
  const sites = useLiveQuery(() => db.sites.orderBy("createdAt").reverse().toArray(), []);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("borewell");

  async function handleCreate() {
    if (!name.trim()) return;
    await createSite({ name: name.trim(), sourceType });
    setName("");
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Site name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as SourceType)}
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="bg-slate-900 text-white rounded px-4 py-2" onClick={handleCreate}>
          Add site
        </button>
      </div>

      <ul className="divide-y">
        {(sites ?? []).map((site) => (
          <li key={site.id} className="py-3">
            <Link href={`/sites/${site.id}`} className="font-medium hover:underline">
              {site.name}
            </Link>
            <span className="text-sm text-slate-500 ml-2">{site.sourceType}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/page.tsx`**

```tsx
// src/app/page.tsx
import { SiteList } from "@/components/SiteList";

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Water Advisor</h1>
      <SiteList />
    </main>
  );
}
```

- [ ] **Step 3: Write `src/app/sites/[siteId]/page.tsx`**

```tsx
// src/app/sites/[siteId]/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const site = useLiveQuery(() => db.sites.get(siteId), [siteId]);
  const analyses = useLiveQuery(
    () => db.analyses.where("siteId").equals(siteId).reverse().sortBy("date"),
    [siteId]
  );

  if (!site) return <main className="p-6">Loading...</main>;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{site.name}</h1>
      <p className="text-slate-500">{site.sourceType}</p>
      <Link
        href={`/analysis/new?siteId=${siteId}`}
        className="inline-block bg-slate-900 text-white rounded px-4 py-2"
      >
        New analysis
      </Link>
      <ul className="divide-y">
        {(analyses ?? []).map((a) => (
          <li key={a.id} className="py-3">
            <Link href={`/analysis/${a.id}`} className="hover:underline">
              {a.date} — {a.parameters.salinityPpt} ppt
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, open `http://localhost:3000`, create a site, click into it.
Expected: site is created, appears in the list, detail page loads and shows the "New analysis" link.

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteList.tsx src/app/page.tsx src/app/sites/
git commit -m "feat: add home and site detail screens"
```

---

### Task 13: New Analysis flow UI

**Files:**
- Create: `src/components/ParameterForm.tsx`
- Create: `src/components/SpeciesPicker.tsx`
- Create: `src/app/analysis/new/page.tsx`

**Interfaces:**
- Consumes: `WaterParameters`, `SourceType` from `@/lib/types`; `SPECIES` from `@/lib/data/species`; `saveAnalysis`, `db` from `@/lib/db`; `runDiagnosis` from `@/lib/engine/runDiagnosis`
- Produces: `<ParameterForm onChange={...} />`, `<SpeciesPicker selected={...} onChange={...} />`; working `/analysis/new?siteId=...` route that saves an `Analysis` with a computed `diagnosisSnapshot` and redirects to the report.

- [ ] **Step 1: Write `src/components/ParameterForm.tsx`**

```tsx
// src/components/ParameterForm.tsx
"use client";

import type { WaterParameters } from "@/lib/types";

const FIELDS: { key: keyof WaterParameters; label: string; required?: boolean }[] = [
  { key: "salinityPpt", label: "Salinity (ppt)", required: true },
  { key: "pH", label: "pH", required: true },
  { key: "sodiumMgL", label: "Sodium (mg/L)" },
  { key: "potassiumMgL", label: "Potassium (mg/L)" },
  { key: "calciumMgL", label: "Calcium (mg/L)" },
  { key: "magnesiumMgL", label: "Magnesium (mg/L)" },
  { key: "chlorideMgL", label: "Chloride (mg/L)" },
  { key: "alkalinityMgL", label: "Alkalinity (mg/L)" },
  { key: "hardnessMgL", label: "Hardness (mg/L)" },
  { key: "tdsMgL", label: "TDS (mg/L)" },
  { key: "temperatureC", label: "Temperature (°C)" },
];

export function ParameterForm({
  value,
  onChange,
}: {
  value: Partial<WaterParameters>;
  onChange: (next: Partial<WaterParameters>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="text-sm">
          {f.label}
          {f.required ? " *" : ""}
          <input
            type="number"
            step="any"
            className="border rounded px-2 py-1 w-full mt-1"
            value={value[f.key] ?? ""}
            onChange={(e) =>
              onChange({ ...value, [f.key]: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/SpeciesPicker.tsx`**

```tsx
// src/components/SpeciesPicker.tsx
"use client";

import { SPECIES } from "@/lib/data/species";

export function SpeciesPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium mb-1">Target species (select one or more for IMTA)</legend>
      {SPECIES.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
          {s.commonName} ({s.scientificName})
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 3: Write `src/app/analysis/new/page.tsx`**

```tsx
// src/app/analysis/new/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ParameterForm } from "@/components/ParameterForm";
import { SpeciesPicker } from "@/components/SpeciesPicker";
import { saveAnalysis } from "@/lib/db";
import { runDiagnosis } from "@/lib/engine/runDiagnosis";
import type { WaterParameters } from "@/lib/types";

export default function NewAnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const siteId = searchParams.get("siteId") ?? "";

  const [parameters, setParameters] = useState<Partial<WaterParameters>>({});
  const [speciesIds, setSpeciesIds] = useState<string[]>([]);
  const [volumeM3, setVolumeM3] = useState<number | undefined>(undefined);

  async function handleRun() {
    if (parameters.salinityPpt === undefined || parameters.pH === undefined) {
      alert("Salinity and pH are required.");
      return;
    }
    const id = crypto.randomUUID();
    const analysis = {
      id,
      siteId,
      date: new Date().toISOString().slice(0, 10),
      parameters: parameters as WaterParameters,
      targetSpeciesIds: speciesIds,
      volumeM3,
    };
    const diagnosisSnapshot = runDiagnosis(analysis);
    await saveAnalysis({ ...analysis, diagnosisSnapshot });
    router.push(`/analysis/${id}`);
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Analysis</h1>

      <ParameterForm value={parameters} onChange={setParameters} />

      <SpeciesPicker selected={speciesIds} onChange={setSpeciesIds} />

      <label className="text-sm block">
        Pond/tank volume (m³)
        <input
          type="number"
          className="border rounded px-2 py-1 w-full mt-1"
          value={volumeM3 ?? ""}
          onChange={(e) => setVolumeM3(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </label>

      <button className="bg-slate-900 text-white rounded px-4 py-2" onClick={handleRun}>
        Run diagnosis
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, navigate to `/analysis/new?siteId=<a real site id from Task 12>`, fill in salinity/pH/potassium, select vannamei, set a volume, click "Run diagnosis."
Expected: redirects to `/analysis/<new-id>` (a 404 is expected until Task 14 builds that route — confirm the analysis record was saved correctly via the site detail page's analysis list instead).

- [ ] **Step 5: Commit**

```bash
git add src/components/ParameterForm.tsx src/components/SpeciesPicker.tsx src/app/analysis/new/
git commit -m "feat: add new analysis flow (parameter form, species picker, diagnosis run)"
```

---

### Task 14: Diagnosis Report UI

**Files:**
- Create: `src/components/DiagnosisReportView.tsx`
- Create: `src/app/analysis/[analysisId]/page.tsx`

**Interfaces:**
- Consumes: `DiagnosisResult`, `Analysis` from `@/lib/types`; `db` from `@/lib/db`
- Produces: `<DiagnosisReportView diagnosis={...} />`; working `/analysis/[analysisId]` route.

- [ ] **Step 1: Write `src/components/DiagnosisReportView.tsx`**

```tsx
// src/components/DiagnosisReportView.tsx
import type { DiagnosisResult } from "@/lib/types";

export function DiagnosisReportView({ diagnosis }: { diagnosis: DiagnosisResult }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold mb-2">Source anomalies</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {diagnosis.sourceAnomalies.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Per-species risk</h2>
        {Object.entries(diagnosis.perSpecies).map(([id, info]) => (
          <div key={id} className="border rounded p-3 mb-2">
            <div className="flex justify-between">
              <span className="font-medium">{id}</span>
              <span
                className={
                  info.riskLevel === "high"
                    ? "text-red-600"
                    : info.riskLevel === "moderate"
                      ? "text-amber-600"
                      : "text-green-600"
                }
              >
                {info.riskLevel}
              </span>
            </div>
            <ul className="list-disc list-inside text-sm mt-1">
              {info.deviations.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {diagnosis.imtaNotes.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">IMTA compatibility</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {diagnosis.imtaNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {diagnosis.matchedFailureModes.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Matched failure modes</h2>
          {diagnosis.matchedFailureModes.map((m) => (
            <div key={m.id} className="border rounded p-3 mb-2">
              <div className="font-medium">{m.symptomPattern}</div>
              <p className="text-sm mt-1">{m.diagnosis}</p>
              <ul className="list-disc list-inside text-sm mt-1">
                {m.correctiveSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-1">{m.sourceCitation}</p>
            </div>
          ))}
        </section>
      )}

      {diagnosis.dosingPlan.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Dosing plan</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1">Compound</th>
                <th className="py-1">Quantity (kg)</th>
                <th className="py-1">For</th>
              </tr>
            </thead>
            <tbody>
              {diagnosis.dosingPlan.map((d, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1">{d.compound}</td>
                  <td className="py-1">{d.quantityKg}</td>
                  <td className="py-1">{d.forParameter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/analysis/[analysisId]/page.tsx`**

```tsx
// src/app/analysis/[analysisId]/page.tsx
"use client";

import { use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { DiagnosisReportView } from "@/components/DiagnosisReportView";

export default function AnalysisReportPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = use(params);
  const analysis = useLiveQuery(() => db.analyses.get(analysisId), [analysisId]);

  if (!analysis) return <main className="p-6">Loading...</main>;
  if (!analysis.diagnosisSnapshot) return <main className="p-6">No diagnosis recorded for this analysis.</main>;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Diagnosis Report — {analysis.date}</h1>
      <DiagnosisReportView diagnosis={analysis.diagnosisSnapshot} />
    </main>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, run a full flow from Home → new site → new analysis (use the Nalgonda-style values: salinity 2, pH 7.6, potassium 8.4, volume 10000) → confirm the report page shows the molt-failure match and a non-zero KCl dosing quantity.
Expected: matches Task 10's automated test assertions, visible in the UI.

- [ ] **Step 4: Commit**

```bash
git add src/components/DiagnosisReportView.tsx src/app/analysis/\[analysisId\]/
git commit -m "feat: add diagnosis report screen"
```

---

### Task 15: AI Chat UI

**Files:**
- Create: `src/components/ChatPanel.tsx`
- Modify: `src/app/analysis/[analysisId]/page.tsx`

**Interfaces:**
- Consumes: `Analysis`, `DiagnosisResult` from `@/lib/types`; calls `POST /api/advisor` (Task 11) with `{ mode: "chat", ... }`
- Produces: `<ChatPanel analysis={...} diagnosis={...} />`

- [ ] **Step 1: Write `src/components/ChatPanel.tsx`**

```tsx
// src/components/ChatPanel.tsx
"use client";

import { useState } from "react";
import type { Analysis, DiagnosisResult } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function ChatPanel({ analysis, diagnosis }: { analysis: Analysis; diagnosis: DiagnosisResult }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        body: JSON.stringify({ mode: "chat", analysis, diagnosis, userMessage }),
      });
      const body = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: body.reply }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-3 space-y-3">
      <h2 className="font-semibold">Ask about this diagnosis</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="inline-block bg-slate-100 rounded px-2 py-1 text-sm">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a follow-up question..."
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1" onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the report page**

```tsx
// src/app/analysis/[analysisId]/page.tsx
"use client";

import { use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { DiagnosisReportView } from "@/components/DiagnosisReportView";
import { ChatPanel } from "@/components/ChatPanel";

export default function AnalysisReportPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = use(params);
  const analysis = useLiveQuery(() => db.analyses.get(analysisId), [analysisId]);

  if (!analysis) return <main className="p-6">Loading...</main>;
  if (!analysis.diagnosisSnapshot) return <main className="p-6">No diagnosis recorded for this analysis.</main>;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Diagnosis Report — {analysis.date}</h1>
      <DiagnosisReportView diagnosis={analysis.diagnosisSnapshot} />
      <ChatPanel analysis={analysis} diagnosis={analysis.diagnosisSnapshot} />
    </main>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: with `ANTHROPIC_API_KEY` set in `.env.local`, `npm run dev`, open a diagnosis report, ask "why does potassium matter here?"
Expected: a grounded reply referencing the diagnosis data.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChatPanel.tsx src/app/analysis/\[analysisId\]/page.tsx
git commit -m "feat: add AI chat panel to diagnosis report"
```

---

### Task 16: Knowledge Base browser

**Files:**
- Create: `src/app/knowledge-base/page.tsx`

**Interfaces:**
- Consumes: `SPECIES` from `@/lib/data/species`; `FAILURE_MODES` from `@/lib/data/failureModes`

- [ ] **Step 1: Write the page**

```tsx
// src/app/knowledge-base/page.tsx
import { SPECIES } from "@/lib/data/species";
import { FAILURE_MODES } from "@/lib/data/failureModes";

export default function KnowledgeBasePage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Knowledge Base</h1>

      <section>
        <h2 className="font-semibold mb-2">Species</h2>
        {SPECIES.map((s) => (
          <div key={s.id} className="border rounded p-3 mb-2">
            <div className="font-medium">
              {s.commonName} ({s.scientificName})
            </div>
            <p className="text-sm">
              Salinity tolerance: {s.salinityToleranceRangePpt.join("-")} ppt
            </p>
            <p className="text-xs text-slate-500">{s.sourceCitation}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Failure modes</h2>
        {FAILURE_MODES.map((m) => (
          <div key={m.id} className="border rounded p-3 mb-2">
            <div className="font-medium">{m.symptomPattern}</div>
            <p className="text-xs text-slate-500 mt-1">{m.sourceCitation}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open `/knowledge-base`.
Expected: shows the vannamei profile and the molt-failure entry with citations.

- [ ] **Step 3: Commit**

```bash
git add src/app/knowledge-base/
git commit -m "feat: add knowledge base browser screen"
```

---

### Task 17: PWA polish + Vercel deploy

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (generated, not hand-authored — see step 1)
- Modify: `public/manifest.json`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: an installable PWA with real icons, linked from `layout.tsx`; a live Vercel deployment.

- [ ] **Step 1: Generate app icons**

Use any square source image representing the app (a simple monochrome water-drop or wave mark is enough — this is a personal tool, not a branded release). Resize to 192x192 and 512x512 PNGs and save to `public/icons/icon-192.png` and `public/icons/icon-512.png`. If no source image is available, generate one with an image tool and confirm both files exist and are valid PNGs before proceeding — do not leave this as a broken link in the manifest.

- [ ] **Step 2: Update `public/manifest.json`**

```json
{
  "name": "Water Advisor",
  "short_name": "WaterAdvisor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: Link the manifest in `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Water Advisor",
  description: "Water source diagnosis and corrective protocols for aquaculture stocking plans.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Deploy to Vercel**

Run: `npx vercel` (first deploy, follow prompts to link/create the project), then `npx vercel env add ANTHROPIC_API_KEY` to set the key in the Vercel project, then `npx vercel --prod`.
Expected: a live URL; opening it on a phone browser and using "Add to Home Screen" installs it as a standalone app.

- [ ] **Step 6: Commit**

```bash
git add public/manifest.json public/icons src/app/layout.tsx
git commit -m "feat: complete PWA installability (icons, manifest) and deploy to Vercel"
```

---

### Task 18: Research and populate IMTA co-species

Not implementable as scripted TDD steps — this is a research task with the same rigor standard as the guide itself (spec Section 7, Global Constraints above). Do this task using the research approach already proven on the guide: trace every quantitative claim to a named, checkable source, and log it.

**Files:**
- Modify: `src/lib/data/species.ts` (add tilapia, seaweed, bivalve, and biofloc-consortium entries)
- Modify: `src/lib/data/imtaRules.ts` (add pairwise compatibility rules against vannamei and against each other)
- Create: `docs/superpowers/plans/2026-08-05-imta-species-stress-test-log.md` (mirrors the guide's own `Stress-Test-and-Literature-Cross-Check-Log.md` format: claim, source, verification status)
- Test: extend `src/lib/data/species.test.ts` and `src/lib/engine/imtaCompatibility.test.ts` with real assertions once the data exists

- [ ] **Step 1: Research and draft profiles**

For each of: Nile/red tilapia (*Oreochromis niloticus* / hybrid), Gracilaria or Ulva seaweed, bivalves (oysters/clams/mussels — pick the species most relevant to the salinity bands already in scope), and the biofloc bacterial consortia referenced in Ch.8/Ch.11 — research salinity tolerance range, trophic role, and any documented water-quality sensitivity thresholds, each with a named source (peer-reviewed paper, extension publication, or the same caliber of source the guide itself uses). Log every claim in the new stress-test file before adding it to `species.ts`, following the exact claim/source/status format used in the guide's own log.

- [ ] **Step 2: Add the profiles to `src/lib/data/species.ts`**

Follow the `SpeciesProfile` shape from Task 5 exactly. Leave any field without a located source unset, same discipline as the vannamei profile's `sensitivityThresholds`.

- [ ] **Step 3: Research and add IMTA compatibility rules to `src/lib/data/imtaRules.ts`**

For each pair among {vannamei, tilapia, seaweed, bivalve, biofloc-consortium} that has a documented IMTA precedent, add an `ImtaCompatibilityRule` entry with `toleranceOverlapPpt` computed from the two species' profiles and `stockingRatioGuidance`/`knownConflicts` sourced the same way. Do not add a rule for a pair with no located source — `checkImtaCompatibility`'s existing "no compatibility rule on file" fallback (Task 9) already handles that honestly.

- [ ] **Step 4: Extend the test suites**

Add real assertions to `src/lib/data/species.test.ts` (one per new species, checking tolerance range and citation) and `src/lib/engine/imtaCompatibility.test.ts` (checking that a populated pair like vannamei+tilapia no longer returns "no compatibility rule on file" but a real compatibility note instead).

Run: `npx vitest run src/lib`
Expected: all pass, including the updated assertions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/species.ts src/lib/data/imtaRules.ts src/lib/data/species.test.ts src/lib/engine/imtaCompatibility.test.ts docs/superpowers/plans/2026-08-05-imta-species-stress-test-log.md
git commit -m "feat: populate IMTA co-species profiles and compatibility rules"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Architecture (Task 1, 3, 11, 17), data model (Task 2), diagnostic engine steps 1-5 (Tasks 4, 6, 9, 8, 7, wired in 10), AI chat layer (Task 11, 15), all six screens (Tasks 12-16), V1 content scope (Task 5 for vannamei, Task 18 for the four co-species), testing approach (every engine/data task carries its own unit tests, grounded in the guide's worked examples per spec Section 8). Out-of-scope items (spec Section 9) are not built: no sync, no cost estimation, no client-facing version.
- **Type consistency:** `DiagnosisResult`, `WaterParameters`, `Analysis`, `SpeciesProfile`, `ImtaCompatibilityRule`, `FailureMode`, `DosingRecipe` are defined once in Task 2 and imported (never redefined) in every subsequent task.
- **Known limitation carried forward, not hidden:** Task 9 ships with an empty `IMTA_RULES` table by design — real IMTA diagnostic power only arrives after Task 18's research is done. The engine reports this honestly rather than silently returning nothing.
