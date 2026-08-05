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
