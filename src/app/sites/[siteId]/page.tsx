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
