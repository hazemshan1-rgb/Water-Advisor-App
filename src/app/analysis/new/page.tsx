// src/app/analysis/new/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ParameterForm, REQUIRED_PARAMETER_FIELDS } from "@/components/ParameterForm";
import { SpeciesPicker } from "@/components/SpeciesPicker";
import { saveAnalysis } from "@/lib/db";
import { runDiagnosis } from "@/lib/engine/runDiagnosis";
import type { SystemType, WaterParameters } from "@/lib/types";

function NewAnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const siteId = searchParams.get("siteId") ?? "";

  const [parameters, setParameters] = useState<Partial<WaterParameters>>({});
  const [speciesIds, setSpeciesIds] = useState<string[]>([]);
  const [volumeM3, setVolumeM3] = useState<number | undefined>(undefined);
  const [targetSalinityPpt, setTargetSalinityPpt] = useState<number | undefined>(undefined);
  const [systemType, setSystemType] = useState<SystemType>("open-pond");
  const [postlarvalAgeDays, setPostlarvalAgeDays] = useState<number | undefined>(undefined);

  async function handleRun() {
    const missing = REQUIRED_PARAMETER_FIELDS.filter((f) => parameters[f.key] === undefined);
    if (missing.length > 0) {
      alert(`All water parameters are required for an accurate diagnosis. Missing: ${missing.map((f) => f.label).join(", ")}.`);
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
      targetSalinityPpt,
      systemType,
      postlarvalAgeDays,
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
        Postlarval age at stocking/transfer (days, optional)
        <input
          type="number"
          className="border rounded px-2 py-1 w-full mt-1"
          value={postlarvalAgeDays ?? ""}
          onChange={(e) =>
            setPostlarvalAgeDays(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
        <span className="text-xs text-slate-500 block mt-1">
          Only affects vannamei so far — direct-transfer survival varies enormously by PL age at low salinity (documented ~30x difference between PL-8 and PL-22).
        </span>
      </label>

      <label className="text-sm block">
        Pond/tank volume (m³)
        <input
          type="number"
          className="border rounded px-2 py-1 w-full mt-1"
          value={volumeM3 ?? ""}
          onChange={(e) => setVolumeM3(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </label>

      <fieldset className="border rounded p-3 space-y-3">
        <legend className="text-sm font-medium px-1">Building salinity? (optional)</legend>
        <label className="text-sm block">
          Target salinity (ppt)
          <input
            type="number"
            step="any"
            className="border rounded px-2 py-1 w-full mt-1"
            value={targetSalinityPpt ?? ""}
            onChange={(e) =>
              setTargetSalinityPpt(e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
        </label>
        <label className="text-sm block">
          System type
          <select
            className="border rounded px-2 py-1 w-full mt-1"
            value={systemType}
            onChange={(e) => setSystemType(e.target.value as SystemType)}
          >
            <option value="open-pond">Open pond (some water exchange)</option>
            <option value="closed-system">Closed system (RAS/biofloc, minimal exchange)</option>
          </select>
        </label>
      </fieldset>

      <button className="bg-slate-900 text-white rounded px-4 py-2" onClick={handleRun}>
        Run diagnosis
      </button>
    </main>
  );
}

export default function NewAnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewAnalysisContent />
    </Suspense>
  );
}
