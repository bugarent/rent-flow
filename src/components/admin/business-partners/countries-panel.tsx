"use client";

import { useEffect, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { europeAndAsiaCountries } from "@/lib/catalog/world-countries";
import type { BusinessPartnerSettings } from "@/lib/catalog/business-partners";

const ALL = europeAndAsiaCountries();
const EUROPE = ALL.filter((c) => c.hoverRegion === "Europe");
const ASIA = ALL.filter((c) => c.hoverRegion === "Asia");

export function BusinessPartnerCountriesPanel({
  settings,
  onSaved,
  hideTitle = false,
}: {
  settings: BusinessPartnerSettings;
  onSaved: (next: BusinessPartnerSettings) => void;
  hideTitle?: boolean;
}) {
  const L = useBpLabels();
  const [selected, setSelected] = useState<string[]>(settings.countryIso2s);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelected(settings.countryIso2s);
  }, [settings.countryIso2s]);

  const selectedSet = new Set(selected);

  const toggle = (iso2: string) => {
    setSelected((prev) =>
      prev.includes(iso2) ? prev.filter((c) => c !== iso2) : [...prev, iso2],
    );
    setMessage("");
  };

  const save = async () => {
    if (selected.length === 0) {
      setError(L.pickCountry);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/business-partners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryIso2s: selected }),
      });
      const data = (await res.json()) as {
        settings?: BusinessPartnerSettings;
        error?: string;
      };
      if (!res.ok || !data.settings) {
        setError(data.error || L.saveFailed);
        return;
      }
      onSaved(data.settings);
      setMessage(L.saved);
    } catch {
      setError(L.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        {hideTitle ? (
          <div />
        ) : (
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f4b]">{L.countriesTitle}</h2>
            <p className="mt-1 text-xs text-slate-500">{L.countriesBody}</p>
          </div>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-md bg-[#1d6fe8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1557c0] disabled:opacity-50"
        >
          {saving ? L.saving : L.save}
        </button>
      </div>

      <p className="mb-3 text-xs font-semibold text-sky-800">
        {L.selectedCountries} {selected.length} {L.countriesWord}
      </p>
      {error ? <p className="mb-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="mb-2 text-sm font-semibold text-emerald-600">{message}</p> : null}

      <div className="grid max-h-64 gap-4 overflow-y-auto sm:grid-cols-2">
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Europe</p>
          <ul className="space-y-1">
            {EUROPE.map((c) => (
              <li key={c.iso2}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedSet.has(c.iso2)}
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
                    checked={selectedSet.has(c.iso2)}
                    onChange={() => toggle(c.iso2)}
                  />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
