// src/components/ImportButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { db } from "@/lib/db";

interface ImportButtonProps {
  submissionId: string;
  siteName: string | null;
}

// Deliberately does NOT auto-create a Site when no name match is found --
// Site.sourceType (borewell/brackish/underground/surface) materially
// changes which diagnosis rules apply, and the intake form doesn't collect
// it. Guessing it would be exactly the kind of silent, unverified inference
// this app's chat guardrails and confidence engine exist to prevent (see
// api/advisor/route.ts's system prompt). A name match against an existing,
// already-correctly-classified Site is the only case handled automatically.
export function ImportButton({ submissionId, siteName }: ImportButtonProps) {
  const router = useRouter();

  async function handleImport() {
    const normalized = (siteName ?? "").trim().toLowerCase();
    const match = normalized
      ? (await db.sites.toArray()).find((s) => s.name.trim().toLowerCase() === normalized)
      : undefined;

    if (match) {
      router.push(`/analysis/new?siteId=${match.id}&intakeId=${submissionId}`);
      return;
    }

    alert(
      `No existing site named "${siteName ?? "(none given)"}" found. Create it on the home page first — source type has to be set correctly for an accurate diagnosis, and the intake form doesn't ask for it — then come back and import this submission.`
    );
    router.push("/");
  }

  return (
    <button
      className="text-sm bg-slate-900 text-white rounded px-3 py-1.5"
      onClick={handleImport}
    >
      Import
    </button>
  );
}
