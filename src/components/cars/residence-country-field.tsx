"use client";

import { useMemo } from "react";
import { WORLD_COUNTRIES } from "@/lib/catalog/world-countries";
import { cn } from "@/lib/utils";

const COUNTRY_OPTIONS = [...WORLD_COUNTRIES]
  .map((c) => c.name)
  .sort((a, b) => a.localeCompare(b, "en"));

export function ResidenceCountryField({
  label,
  placeholder,
  value,
  onChange,
  invalid = false,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (country: string) => void;
  invalid?: boolean;
  hint?: React.ReactNode;
}) {
  const options = useMemo(() => {
    if (value && !COUNTRY_OPTIONS.includes(value)) {
      return [value, ...COUNTRY_OPTIONS];
    }
    return COUNTRY_OPTIONS;
  }, [value]);

  return (
    <label
      className="block text-sm font-semibold text-slate-700"
      data-invalid-field={invalid ? "true" : undefined}
    >
      {label}
      <select
        className={cn(
          "mt-1 w-full rounded-md border p-2.5 text-sm outline-none transition",
          invalid
            ? "border-2 border-red-500 bg-red-50 text-slate-900 ring-2 ring-red-200"
            : "border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
        )}
        value={value}
        aria-required
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {hint}
    </label>
  );
}
