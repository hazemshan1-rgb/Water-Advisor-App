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
