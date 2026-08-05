// src/lib/engine/imtaCompatibility.ts
import { IMTA_RULES } from "../data/imtaRules";

function findRule(speciesIdA: string, speciesIdB: string) {
  return IMTA_RULES.find(
    (r) =>
      (r.speciesIdA === speciesIdA && r.speciesIdB === speciesIdB) ||
      (r.speciesIdA === speciesIdB && r.speciesIdB === speciesIdA)
  );
}

export function checkImtaCompatibility(speciesIds: string[]): string[] {
  if (speciesIds.length < 2) return [];

  const notes: string[] = [];
  for (let i = 0; i < speciesIds.length; i++) {
    for (let j = i + 1; j < speciesIds.length; j++) {
      const a = speciesIds[i];
      const b = speciesIds[j];
      const rule = findRule(a, b);
      if (!rule) {
        notes.push(`${a} + ${b}: no compatibility rule on file yet — do not assume compatibility without checking manually.`);
        continue;
      }
      if (!rule.compatible) {
        notes.push(`${a} + ${b}: NOT compatible. ${rule.knownConflicts ?? ""}`.trim());
      } else {
        notes.push(
          `${a} + ${b}: compatible. ${rule.stockingRatioGuidance ?? ""}`.trim()
        );
      }
    }
  }
  return notes;
}
