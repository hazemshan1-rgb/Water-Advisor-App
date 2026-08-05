// src/app/sites/[siteId]/page.tsx
"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { detectTrends } from "@/lib/engine/trendAnalysis";

export default function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const site = useLiveQuery(() => db.sites.get(siteId), [siteId]);
  const analyses = useLiveQuery(
    () => db.analyses.where("siteId").equals(siteId).reverse().sortBy("date"),
    [siteId]
  );
  const trends = useMemo(() => detectTrends(analyses ?? []), [analyses]);

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

      {trends.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded p-3 space-y-2">
          <h2 className="text-sm font-semibold text-amber-900">Trend alerts</h2>
          <p className="text-xs text-amber-800">
            Based on the last 3 readings across this site&apos;s analysis history — a worsening trajectory even before any single reading crosses its acute threshold. Not a guide citation; a disclosed early-warning heuristic (see trendAnalysis.ts).
          </p>
          <ul className="space-y-1">
            {trends.map((t, i) => (
              <li key={i} className="text-sm text-amber-900">
                {t.message}
              </li>
            ))}
          </ul>
        </div>
      )}

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
