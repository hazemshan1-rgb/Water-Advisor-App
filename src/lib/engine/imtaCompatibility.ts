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
        // "Compatible" and "has a documented caveat" are not mutually
        // exclusive -- a pair can be real-world compatible AND carry a
        // known conflict/caveat (e.g. tilapia+green-mussel: works, but only
        // under a different species than the one profiled). Dropping
        // knownConflicts here silently discarded exactly that kind of
        // caveat -- found during field-testing, 2026-08-05.
        const guidance = [rule.stockingRatioGuidance, rule.knownConflicts].filter(Boolean).join(" ");
        notes.push(`${a} + ${b}: compatible. ${guidance}`.trim());
      }
    }
  }
  return notes;
}
