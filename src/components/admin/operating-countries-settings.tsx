"use client";

import { europeAndAsiaCountries } from "@/lib/catalog/world-countries";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";

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
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
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
          <p className="text-sm font-semibold">{phrase("Partner operating countries", "პარტნიორის ოპერირების ქვეყნები", "Страны работы партнёра")}</p>
          <p className="mt-1 text-xs text-slate-500">
            {phrase(
              "These Europe and Asia countries appear in the partner list. Leave all selected to offer the full catalog.",
              "ეს ევროპისა და აზიის ქვეყნები ჩანს პარტნიორის სიაში. სრული კატალოგისთვის ყველა დატოვეთ მონიშნული.",
              "Эти страны Европы и Азии видны в списке партнёра. Оставьте все выбранными для полного каталога.",
            )}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-1 text-xs font-semibold"
          onClick={() => onChange([])}
        >
          {phrase("Offer all", "ყველას შეთავაზება", "Предлагать все")}
        </button>
      </div>
      <p className="mb-3 text-xs font-semibold text-sky-800">
        {allSelected
          ? phrase("All Europe and Asia countries are offered to partners.", "პარტნიორებს სთავაზობენ ევროპისა და აზიის ყველა ქვეყანას.", "Партнёрам предлагаются все страны Европы и Азии.")
          : phrase(`${selected.length} countries selected.`, `არჩეულია ${selected.length} ქვეყანა.`, `Выбрано стран: ${selected.length}.`)}
      </p>
      <div className="grid max-h-72 gap-4 overflow-y-auto sm:grid-cols-2">
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{phrase("Europe", "ევროპა", "Европа")}</p>
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
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{phrase("Asia", "აზია", "Азия")}</p>
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
