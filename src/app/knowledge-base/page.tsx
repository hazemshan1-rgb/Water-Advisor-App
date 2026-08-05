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
