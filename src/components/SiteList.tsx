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
