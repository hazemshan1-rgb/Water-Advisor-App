// src/components/DiagnosisReportView.tsx
//
// This report is what gets read out to real clients, so it's built around
// three things beyond the raw diagnosis: what to do first (top actions),
// what NOT to do (blocking issues), and what wasn't tested and why that
// matters (data gaps). Every severity badge and the confidence score come
// straight from the deterministic engine in src/lib/engine -- this
// component only sorts and labels what's already there; it computes
// nothing new.
import type { Confidence, DiagnosisResult, Severity } from "@/lib/types";

const SEVERITY_RANK: Record<Severity, number> = { critical: 3, action: 2, watch: 1, info: 0 };
const SEVERITY_LABEL: Record<Severity, string> = { critical: "Critical", action: "Action", watch: "Watch", info: "Info" };
const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  action: "bg-orange-100 text-orange-800 border-orange-300",
  watch: "bg-amber-100 text-amber-800 border-amber-300",
  info: "bg-slate-100 text-slate-700 border-slate-300",
};

const CONFIDENCE_CLASSES: Record<Confidence, string> = {
  high: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-red-100 text-red-800 border-red-300",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap ${SEVERITY_CLASSES[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

interface PrioritizedItem {
  message: string;
  severity: Severity;
  source: string;
}

function collectPrioritizedItems(diagnosis: DiagnosisResult): PrioritizedItem[] {
  const items: PrioritizedItem[] = [];

  for (const a of diagnosis.sourceAnomalies) {
    items.push({ message: a.message, severity: a.severity, source: "Source water" });
  }
  for (const [speciesId, info] of Object.entries(diagnosis.perSpecies)) {
    for (const d of info.deviations) {
      items.push({ message: d.message, severity: d.severity, source: speciesId });
    }
  }
  for (const m of diagnosis.matchedFailureModes) {
    items.push({ message: m.symptomPattern, severity: m.severity ?? "action", source: "Failure mode" });
  }
  for (const step of diagnosis.dosingPlan) {
    if (step.stage === 1) {
      items.push({
        message: `${step.compound} — ${step.quantityKg} kg (${step.forParameter})`,
        severity: step.severity,
        source: "Dosing",
      });
    }
  }

  return items.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

export function DiagnosisReportView({ diagnosis }: { diagnosis: DiagnosisResult }) {
  const prioritized = collectPrioritizedItems(diagnosis);
  const topActions = prioritized.filter((i) => i.severity !== "info").slice(0, 3);
  const blockingItems = prioritized.filter((i) => i.severity === "critical");

  return (
    <div className="space-y-6">
      <section className="border rounded p-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Confidence</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${CONFIDENCE_CLASSES[diagnosis.confidence]}`}>
            {diagnosis.confidence}
          </span>
        </div>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
          {diagnosis.confidenceReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      {blockingItems.length > 0 && (
        <section className="border-2 border-red-300 bg-red-50 rounded p-3">
          <h2 className="font-semibold mb-2 text-red-800">Do not proceed until these are resolved</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-900">
            {blockingItems.map((item, i) => (
              <li key={i}>
                <span className="font-medium">[{item.source}]</span> {item.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {topActions.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Top priority actions</h2>
          <ol className="space-y-2 text-sm">
            {topActions.map((item, i) => (
              <li key={i} className="border rounded p-2 flex items-start justify-between gap-3">
                <span>
                  <span className="font-medium">{i + 1}.</span> [{item.source}] {item.message}
                </span>
                <SeverityBadge severity={item.severity} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {diagnosis.dataGaps.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Data gaps</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
            {diagnosis.dataGaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Source anomalies</h2>
        <ul className="space-y-1 text-sm">
          {diagnosis.sourceAnomalies.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <SeverityBadge severity={a.severity} />
              <span>{a.message}</span>
            </li>
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
            <ul className="space-y-1 text-sm mt-1">
              {info.deviations.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <SeverityBadge severity={d.severity} />
                  <span>{d.message}</span>
                </li>
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
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{m.symptomPattern}</div>
                <SeverityBadge severity={m.severity ?? "action"} />
              </div>
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

      {diagnosis.saltBuildPlan && (
        <section>
          <h2 className="font-semibold mb-2">Salinity build plan</h2>
          <p className="text-sm mb-2">
            Raising salinity by <span className="font-medium">{diagnosis.saltBuildPlan.pptToRaise} ppt</span> using{" "}
            <span className="font-medium">
              {diagnosis.saltBuildPlan.recommendedSource === "lcsm"
                ? "a low-cost salt mixture (LCSM)"
                : "reconstituted sea salt (RSS)"}
            </span>
            .
          </p>
          <p className="text-xs text-slate-500 mb-2 italic">{diagnosis.saltBuildPlan.recommendationReason}</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1">Compound</th>
                <th className="py-1">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {diagnosis.saltBuildPlan.steps.map((s, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1">{s.compound}</td>
                  <td className="py-1">
                    {s.quantity} {s.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {diagnosis.dosingPlan.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Dosing plan</h2>
          {diagnosis.dosingProtocolNote && (
            <p className="text-xs text-slate-500 mb-2 italic">{diagnosis.dosingProtocolNote}</p>
          )}
          {([1, 2] as const).map((stageNum) => {
            const steps = diagnosis.dosingPlan.filter((s) => s.stage === stageNum);
            if (steps.length === 0) return null;
            return (
              <div key={stageNum} className="mb-3">
                <h3 className="text-sm font-semibold mb-1">
                  Stage {stageNum} — {stageNum === 1 ? "apply now" : "after retest"}
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1">Compound</th>
                      <th className="py-1">Quantity (kg)</th>
                      <th className="py-1">For</th>
                      <th className="py-1">Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((d, i) => (
                      <tr key={i} className="border-b align-top">
                        <td className="py-1">{d.compound}</td>
                        <td className="py-1">{d.quantityKg}</td>
                        <td className="py-1">{d.forParameter}</td>
                        <td className="py-1 text-slate-600">{d.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
