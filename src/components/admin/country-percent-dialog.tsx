"use client";

import { useEffect, useState } from "react";
import { COUNTRY_NAMES_KA } from "@/lib/catalog/country-names-ka";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { CountryFlag } from "@/components/ui/country-flag";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { DEPOSIT_MAX_PERCENT, DEPOSIT_MIN_PERCENT } from "@/lib/brand";
import type { CountryPercentMap } from "@/lib/pricing/country-platform-percents";

export type FeeCountry = { iso2: string };

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

export function CountryPercentDialog({
  open,
  kind,
  countries,
  depositByCountry,
  discountByCountry,
  fallbackDeposit,
  fallbackDiscount,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: "deposit" | "discount";
  countries: FeeCountry[];
  depositByCountry: CountryPercentMap;
  discountByCountry: CountryPercentMap;
  fallbackDeposit: number;
  fallbackDiscount: number;
  onClose: () => void;
  onSaved: (next: { depositPercentByCountry: CountryPercentMap; siteDiscountPercentByCountry: CountryPercentMap }) => void;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rows = [...countries].sort((a, b) =>
    countryLabel(a.iso2, locale).localeCompare(countryLabel(b.iso2, locale), locale),
  );

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const country of countries) {
      const iso = country.iso2.toUpperCase();
      const deposit = Number.isInteger(depositByCountry[iso]) ? depositByCountry[iso] : fallbackDeposit;
      const value = kind === "deposit"
        ? deposit
        : Number.isInteger(discountByCountry[iso])
          ? discountByCountry[iso]
          : Math.min(fallbackDiscount, deposit);
      next[iso] = String(value);
    }
    setDraft(next);
    setError("");
  }, [open, kind, countries, depositByCountry, discountByCountry, fallbackDeposit, fallbackDiscount]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = kind === "deposit"
    ? phrase("Site fee by country", "საიტის მომსახურება ქვეყნებით", "Комиссия сайта по странам")
    : phrase("Site discount by country", "საიტის ფასდაკლება ქვეყნებით", "Скидка сайта по странам");

  const save = async () => {
    const values: Record<string, number> = {};
    for (const country of rows) {
      const iso = country.iso2.toUpperCase();
      const raw = String(draft[iso] ?? "").trim();
      const n = Number(raw);
      const deposit = Number.isInteger(depositByCountry[iso]) ? depositByCountry[iso] : fallbackDeposit;
      const max = kind === "deposit" ? DEPOSIT_MAX_PERCENT : deposit;
      const min = kind === "deposit" ? DEPOSIT_MIN_PERCENT : 0;
      if (!/^\d+$/.test(raw) || !Number.isInteger(n) || n < min || n > max) {
        setError(
          phrase(
            `${countryLabel(iso, locale)}: enter an integer from ${min} to ${max}`,
            `${countryLabel(iso, locale)}: ჩაწერეთ მთელი რიცხვი ${min}-დან ${max}-მდე`,
            `${countryLabel(iso, locale)}: введите целое число от ${min} до ${max}`,
          ),
        );
        return;
      }
      values[iso] = n;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/country-percents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save");
      onSaved({
        depositPercentByCountry: data.depositPercentByCountry || {},
        siteDiscountPercentByCountry: data.siteDiscountPercentByCountry || {},
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={phrase("Close", "დახურვა", "Закрыть")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-percent-title"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="border-b px-4 py-4">
          <h2 id="country-percent-title" className="text-lg font-extrabold text-[#0b1f4b]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {phrase(
              "Enter a percent for each activated country, then save. Booking payment uses the pickup country's number.",
              "თითოეულ გააქტიურებულ ქვეყანაზე ჩაწერეთ პროცენტი და შეინახეთ. დაჯავშნის გადახდა აყვანის ქვეყნის რიცხვს იყენებს.",
              "Введите процент для каждой активной страны и сохраните. Оплата брони использует число страны выдачи.",
            )}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {phrase("No activated countries yet.", "გააქტიურებული ქვეყანა ჯერ არ არის.", "Активированных стран пока нет.")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((country) => {
                const iso = country.iso2.toUpperCase();
                const deposit = Number.isInteger(depositByCountry[iso]) ? depositByCountry[iso] : fallbackDeposit;
                const max = kind === "deposit" ? DEPOSIT_MAX_PERCENT : deposit;
                return (
                  <li key={iso} className="flex items-center gap-3 py-2">
                    <CountryFlag iso2={iso} className="h-4 w-6" title={iso} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {countryLabel(iso, locale)}
                    </span>
                    <label className="flex items-center gap-1 text-sm font-semibold text-slate-500">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={kind === "deposit" ? DEPOSIT_MIN_PERCENT : 0}
                        max={max}
                        value={draft[iso] ?? ""}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [iso]: e.target.value }))}
                        className="h-11 w-20 rounded-xl border border-slate-300 px-2 text-base font-semibold text-slate-900 outline-none focus:border-sky-500"
                        aria-label={countryLabel(iso, locale)}
                      />
                      %
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-xl border px-4 text-sm font-bold text-slate-700">
            {phrase("Close", "დახურვა", "Закрыть")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || rows.length === 0}
            className="min-h-11 flex-1 rounded-xl bg-[#0b1f4b] px-4 text-sm font-bold text-white disabled:bg-slate-400"
          >
            {saving ? phrase("Saving…", "ინახება…", "Сохранение…") : phrase("Save", "შენახვა", "Сохранить")}
          </button>
        </div>
      </div>
    </div>
  );
}
