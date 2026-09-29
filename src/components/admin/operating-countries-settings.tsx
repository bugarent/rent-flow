"use client";

import { europeAndAsiaCountries } from "@/lib/catalog/world-countries";

const ALL = europeAndAsiaCountries();
const EUROPE = ALL.filter((c) => c.hoverRegion === "Europe");
const ASIA = ALL.filter((c) => c.hoverRegion === "Asia");

export function OperatingCountriesSettings({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (iso2s: string[]) => void;
}) {
  const selectedSet = new Set(selected);
  const allSelected = selected.length === 0 || selected.length === ALL.length;

  const toggle = (iso2: string) => {
    const current = selected.length === 0 ? ALL.map((c) => c.iso2) : [...selected];
    const next = current.includes(iso2) ? current.filter((item) => item !== iso2) : [...current, iso2];
    onChange(next.length === ALL.length ? [] : next);
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Partner operating countries</p>
          <p className="mt-1 text-xs text-slate-500">
            These Europe and Asia countries appear in the Become a Partner hover list. Leave all selected to offer the
            full catalog.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-1 text-xs font-semibold"
          onClick={() => onChange([])}
        >
          Offer all
        </button>
      </div>
      <p className="mb-3 text-xs font-semibold text-sky-800">
        {allSelected ? "All Europe & Asia countries are offered to partners." : `${selected.length} countries selected.`}
      </p>
      <div className="grid max-h-72 gap-4 overflow-y-auto sm:grid-cols-2">
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Europe</p>
          <ul className="space-y-1">
            {EUROPE.map((c) => (
              <li key={c.iso2}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={allSelected || selectedSet.has(c.iso2)}
                    onChange={() => toggle(c.iso2)}
                  />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Asia</p>
          <ul className="space-y-1">
            {ASIA.map((c) => (
              <li key={c.iso2}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={allSelected || selectedSet.has(c.iso2)}
                    onChange={() => toggle(c.iso2)}
                  />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
