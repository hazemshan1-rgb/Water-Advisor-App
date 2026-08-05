// src/components/ParameterForm.tsx
"use client";

import type { WaterParameters } from "@/lib/types";

const FIELDS: { key: keyof WaterParameters; label: string; required?: boolean }[] = [
  { key: "salinityPpt", label: "Salinity (ppt)", required: true },
  { key: "pH", label: "pH", required: true },
  { key: "sodiumMgL", label: "Sodium (mg/L)" },
  { key: "potassiumMgL", label: "Potassium (mg/L)" },
  { key: "calciumMgL", label: "Calcium (mg/L)" },
  { key: "magnesiumMgL", label: "Magnesium (mg/L)" },
  { key: "chlorideMgL", label: "Chloride (mg/L)" },
  { key: "alkalinityMgL", label: "Alkalinity (mg/L)" },
  { key: "hardnessMgL", label: "Hardness (mg/L)" },
  { key: "tdsMgL", label: "TDS (mg/L)" },
  { key: "temperatureC", label: "Temperature (°C)" },
];

export function ParameterForm({
  value,
  onChange,
}: {
  value: Partial<WaterParameters>;
  onChange: (next: Partial<WaterParameters>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="text-sm">
          {f.label}
          {f.required ? " *" : ""}
          <input
            type="number"
            step="any"
            className="border rounded px-2 py-1 w-full mt-1"
            value={value[f.key] ?? ""}
            onChange={(e) =>
              onChange({ ...value, [f.key]: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
        </label>
      ))}
    </div>
  );
}
