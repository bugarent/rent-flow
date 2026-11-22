"use client";

import { useEffect, useState } from "react";
import { COUNTRY_NAMES_KA } from "@/lib/catalog/country-names-ka";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { CountryFlag } from "@/components/ui/country-flag";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { cn } from "@/lib/utils";

export type TplChoiceCountry = { iso2: string };

function countryLabel(iso2: string, locale: string): string {
  const code = iso2.toUpperCase();
  if (locale === "ka") return COUNTRY_NAMES_KA[code] || worldCountryName(code) || code;
  try {
    const name = new Intl.DisplayNames([locale], { type: "region" }).of(code);
    if (name && name !== code) return name;
  } catch {
    /* locale data missing */
  }
  return worldCountryName(code) || code;
}

/** Activated countries, each with a switch that lets that country's partners choose TPL. */
export function TplCountryChoice({
  open,
  countries,
  selected,
  onClose,
  onChange,
}: {
  open: boolean;
  countries: TplChoiceCountry[];
  selected: string[];
  onClose: () => void;
  onChange: (iso2s: string[]) => void;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [busyIso, setBusyIso] = useState<string | null>(null);
  const [error, setError] = useState("");
  const selectedSet = new Set(selected.map((iso) => iso.toUpperCase()));
  const rows = [...countries].sort((a, b) =>
    countryLabel(a.iso2, locale).localeCompare(countryLabel(b.iso2, locale), locale),
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = async (iso2: string) => {
    const code = iso2.toUpperCase();
    const on = !selectedSet.has(code);
    setBusyIso(code);
    setError("");
    const previous = selected;
    onChange(on ? [...selected, code] : selected.filter((iso) => iso.toUpperCase() !== code));
    try {
      const res = await fetch("/api/admin/extras/tpl-choice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iso2: code, on }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save");
      if (Array.isArray(data.iso2s)) onChange(data.iso2s.map((iso: unknown) => String(iso).toUpperCase()));
    } catch (err) {
      onChange(previous);
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusyIso(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={phrase("Close", "დახურვა", "Закрыть")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-country-choice-title"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="border-b px-4 py-4">
          <h2 id="tpl-country-choice-title" className="text-lg font-extrabold text-[#0b1f4b]">
            {phrase("TPL by country", "TPL ქვეყნების მიხედვით", "TPL по странам")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {phrase(
              "Turn a country on so its partners can switch TPL on or off. Off keeps TPL mandatory and included.",
              "ჩართეთ ქვეყანა, რომ ამ ქვეყნის პარტნიორებმა TPL თავად ჩართონ ან გამორთონ. გამორთული ქვეყანა სავალდებულოდ რჩება.",
              "Включите страну, чтобы её партнёры сами включали или выключали TPL. Выключенная страна остаётся обязательной.",
            )}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {phrase(
                "No activated countries yet.",
                "გააქტიურებული ქვეყანა ჯერ არ არის.",
                "Активированных стран пока нет.",
              )}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((country) => {
                const code = country.iso2.toUpperCase();
                const on = selectedSet.has(code);
                const busy = busyIso === code;
                return (
                  <li key={code} className="flex items-center gap-3 py-2">
                    <CountryFlag iso2={code} className="h-4 w-6" title={code} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {countryLabel(code, locale)}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={busy}
                      onClick={() => void toggle(code)}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-bold transition disabled:opacity-60",
                        on
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-slate-300 bg-white text-slate-600",
                      )}
                    >
                      {busy
                        ? "…"
                        : on
                          ? phrase("Partner chooses", "პარტნიორი ირჩევს", "Партнёр выбирает")
                          : phrase("Mandatory", "სავალდებულო", "Обязательно")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl bg-[#0b1f4b] px-4 text-sm font-bold text-white"
          >
            {phrase("Close", "დახურვა", "Закрыть")}
          </button>
        </div>
      </div>
    </div>
  );
}
