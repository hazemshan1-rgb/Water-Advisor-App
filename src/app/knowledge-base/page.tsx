import { SPECIES } from "@/lib/data/species";
import { FAILURE_MODES } from "@/lib/data/failureModes";
import { LCSM_FORMULA, PURE_SEA_SALT_KG_PER_M3_PER_PPT } from "@/lib/data/saltFormulations";

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

      <section>
        <h2 className="font-semibold mb-2">Salt formulations</h2>
        <div className="border rounded p-3 mb-2">
          <div className="font-medium">Low-Cost Salt Mixture (LCSM) — per 10,000 L, per 1 ppt</div>
          <ul className="text-sm mt-1 list-disc list-inside">
            {LCSM_FORMULA.map((c) => (
              <li key={c.compound}>
                {c.compound}: {c.quantityPer10000LPer1Ppt} {c.unit}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed equivalent to reconstituted sea salt on survival/growth at 3-15 ppt, ~50% cheaper.
            Galkanda-Arachchige, Roy, Kelly &amp; Davis (2022), Responsible Seafood Advocate (Auburn University);
            independently confirmed via Alabama Cooperative Extension System.
          </p>
        </div>
        <div className="border rounded p-3 mb-2">
          <div className="font-medium">Reconstituted sea salt (RSS)</div>
          <p className="text-sm mt-1">≈{PURE_SEA_SALT_KG_PER_M3_PER_PPT} kg/m³ per ppt (pure dissolved solids basis)</p>
          <p className="text-xs text-slate-500 mt-1">
            Recommended for closed systems (RAS/biofloc) with minimal water exchange, for trace-mineral completeness
            — a reasoned caution, not a directly tested finding. Water Management Guide Ch.16.
          </p>
        </div>
      </section>
    </main>
  );
}
