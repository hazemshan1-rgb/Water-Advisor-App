// src/components/ParameterForm.tsx
"use client";

import type { WaterParameters } from "@/lib/types";

export const REQUIRED_PARAMETER_FIELDS: { key: keyof WaterParameters; label: string }[] = [
  { key: "salinityPpt", label: "Salinity (ppt)" },
  { key: "pH", label: "pH" },
  { key: "sodiumMgL", label: "Sodium (mg/L)" },
  { key: "potassiumMgL", label: "Potassium (mg/L)" },
  { key: "calciumMgL", label: "Calcium (mg/L)" },
  { key: "magnesiumMgL", label: "Magnesium (mg/L)" },
  { key: "chlorideMgL", label: "Chloride (mg/L)" },
  { key: "alkalinityMgL", label: "Alkalinity (mg/L)" },
  { key: "hardnessMgL", label: "Hardness (mg/L)" },
  { key: "tdsMgL", label: "TDS (mg/L)" },
  { key: "temperatureC", label: "Temperature (°C)" },
  { key: "ironMgL", label: "Iron (mg/L)" },
  { key: "manganeseMgL", label: "Manganese (mg/L)" },
  { key: "hydrogenSulfideMgL", label: "Hydrogen sulfide (mg/L)" },
  { key: "arsenicMgL", label: "Arsenic (mg/L)" },
  { key: "ammoniumMgL", label: "Ammonium — source water baseline (mg/L)" },
  { key: "tanMgL", label: "Total ammonia nitrogen — in-pond (mg/L)" },
  { key: "nitriteMgL", label: "Nitrite (mg/L)" },
  { key: "doMgL", label: "Dissolved oxygen — dawn reading (mg/L)" },
];

const FIELDS = REQUIRED_PARAMETER_FIELDS;

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
          {f.label} *
          <input
            type="number"
            step="any"
            required
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
