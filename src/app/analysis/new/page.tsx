// src/app/analysis/new/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ParameterForm } from "@/components/ParameterForm";
import { SpeciesPicker } from "@/components/SpeciesPicker";
import { saveAnalysis } from "@/lib/db";
import { runDiagnosis } from "@/lib/engine/runDiagnosis";
import type { WaterParameters } from "@/lib/types";

function NewAnalysisContent() {
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

export default function NewAnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewAnalysisContent />
    </Suspense>
  );
}
