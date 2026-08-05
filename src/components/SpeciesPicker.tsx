// src/components/SpeciesPicker.tsx
"use client";

import { SPECIES } from "@/lib/data/species";

export function SpeciesPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium mb-1">Target species (select one or more for IMTA)</legend>
      {SPECIES.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
          {s.commonName} ({s.scientificName})
        </label>
      ))}
    </fieldset>
  );
}
