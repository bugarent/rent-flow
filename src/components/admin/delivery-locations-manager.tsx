"use client";

import { useMemo, useState } from "react";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import type { FxRates } from "@/lib/fx";
import { DEFAULT_FX_RATES } from "@/lib/fx";
import type { Currency } from "@/lib/i18n/config";
import {
  convertFromEur,
  convertToEur,
  currencySymbol,
  formatAmountNumber,
  roundMoney,
} from "@/lib/utils";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { CountryFlag } from "@/components/ui/country-flag";
import { DeliveryCountryFilter } from "@/components/admin/delivery-country-filter";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

type PricingCurrency = Extract<Currency, "EUR" | "USD">;

function toDisplayAmount(amountEur: number, currency: PricingCurrency, rates: FxRates) {
  return formatAmountNumber(convertFromEur(amountEur, currency, rates));
}

function draftsFromLocations(
  list: DeliveryLocationView[],
  currency: PricingCurrency,
  rates: FxRates,
) {
  const next: Record<string, string> = {};
  for (const item of list) {
    next[item.id] = toDisplayAmount(item.maxDeliveryPriceEur, currency, rates);
  }
  return next;
}

function daysDraftsFromLocations(list: DeliveryLocationView[]) {
  const next: Record<string, string> = {};
  for (const item of list) {
    next[item.id] = item.maxFreeAfterDays == null ? "" : String(item.maxFreeAfterDays);
  }
  return next;
}

function sortLocationsByCountry(list: DeliveryLocationView[]) {
  return [...list].sort((a, b) => {
    const byCountry =
      a.country.localeCompare(b.country, undefined, { sensitivity: "base" }) ||
      a.countryIso2.localeCompare(b.countryIso2);
    if (byCountry !== 0) return byCountry;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

function CurrencyToggle({
  value,
  onChange,
}: {
  value: PricingCurrency;
  onChange: (next: PricingCurrency) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm"
      role="group"
      aria-label="Pricing currency"
    >
      {(["EUR", "USD"] as const).map((code) => {
        const active = value === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(code)}
            className={`min-w-11 rounded-md px-3 py-1.5 text-sm font-extrabold transition ${
              active
                ? "bg-[#0b1f4b] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0b1f4b]"
            }`}
          >
            {currencySymbol(code)}
          </button>
        );
      })}
    </div>
  );
}

export function DeliveryLocationsManager({
  initialLocations,
  fxRates = DEFAULT_FX_RATES,
}: {
  initialLocations: DeliveryLocationView[];
  fxRates?: FxRates;
}) {
  const rates = fxRates;
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [currency, setCurrency] = useState<PricingCurrency>("EUR");
  const [locations, setLocations] = useState(() => sortLocationsByCountry(initialLocations));
  const [priceDrafts, setPriceDrafts] = useState(() =>
    draftsFromLocations(initialLocations, "EUR", rates),
  );
  const [daysDrafts, setDaysDrafts] = useState(() => daysDraftsFromLocations(initialLocations));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [countryIso2, setCountryIso2] = useState("");

  const symbol = currencySymbol(currency);

  const countries = useMemo(() => {
    const map = new Map<string, { iso2: string; name: string; count: number }>();
    for (const item of locations) {
      const iso2 = item.countryIso2.trim().toUpperCase();
      if (!iso2) continue;
      const current = map.get(iso2);
      if (current) current.count += 1;
      else map.set(iso2, { iso2, name: item.country || iso2, count: 1 });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [locations]);

  const activeLocations = useMemo(
    () =>
      sortLocationsByCountry(
        locations.filter(
          (item) => item.isActive && (!countryIso2 || item.countryIso2.trim().toUpperCase() === countryIso2),
        ),
      ),
    [locations, countryIso2],
  );
  const inactiveLocations = useMemo(
    () =>
      sortLocationsByCountry(
        locations.filter(
          (item) => !item.isActive && (!countryIso2 || item.countryIso2.trim().toUpperCase() === countryIso2),
        ),
      ),
    [locations, countryIso2],
  );

  const switchCurrency = (next: PricingCurrency) => {
    if (next === currency) return;
    setCurrency(next);
    setPriceDrafts((prev) => {
      const out: Record<string, string> = {};
      for (const [id, raw] of Object.entries(prev)) {
        const amount = Number(raw);
        if (!Number.isFinite(amount)) {
          out[id] = raw;
          continue;
        }
        const asEur = convertToEur(amount, currency, rates);
        out[id] = toDisplayAmount(asEur, next, rates);
      }
      return out;
    });
  };

  const setDraft = (id: string, value: string) => {
    setPriceDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const saveRow = async (id: string) => {
    setError("");
    setMessage("");
    const raw = priceDrafts[id] ?? "";
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      setError(`Enter a valid maximum delivery price (${symbol}).`);
      return;
    }

    const maxDeliveryPriceEur = convertToEur(amount, currency, rates);
    const daysRaw = (daysDrafts[id] ?? "").trim();
    let maxFreeAfterDays: number | null = null;
    if (daysRaw !== "") {
      const days = Math.floor(Number(daysRaw));
      if (!Number.isFinite(days) || days < 0) {
        setError("Enter a whole number of days, or leave Free after days empty.");
        return;
      }
      maxFreeAfterDays = days;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/delivery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDeliveryPriceEur, maxFreeAfterDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update");
      setLocations((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      setPriceDrafts((prev) => ({
        ...prev,
        [id]: toDisplayAmount(data.maxDeliveryPriceEur, currency, rates),
      }));
      setDaysDrafts((prev) => ({
        ...prev,
        [id]: data.maxFreeAfterDays == null ? "" : String(data.maxFreeAfterDays),
      }));
      const daysLabel = data.maxFreeAfterDays == null ? "no day limit" : `${data.maxFreeAfterDays} days`;
      setMessage(
        `Saved max delivery ${symbol}${toDisplayAmount(data.maxDeliveryPriceEur, currency, rates)} and free after ${daysLabel} for ${data.label || data.iata}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this delivery location? Partner delivery prices for it will be removed.")) return;
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/delivery/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete");
      setLocations((prev) => prev.filter((x) => x.id !== id));
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const toggleActive = async (item: DeliveryLocationView) => {
    setError("");
    setMessage("");
    setSavingId(item.id);
    try {
      const res = await fetch(`/api/admin/delivery/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update");
      setLocations((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      if (!data.isActive) {
        setMessage(`${data.label || data.iata} is inactive and hidden from the list.`);
      } else {
        setMessage(`${data.label || data.iata} is active again.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setSavingId(null);
    }
  };

  const renderRow = (item: DeliveryLocationView, index: number) => {
    const draft = priceDrafts[item.id] ?? toDisplayAmount(item.maxDeliveryPriceEur, currency, rates);
    const storedDisplay = roundMoney(convertFromEur(item.maxDeliveryPriceEur, currency, rates));
    const daysDraft = daysDrafts[item.id] ?? (item.maxFreeAfterDays == null ? "" : String(item.maxFreeAfterDays));
    const storedDays = item.maxFreeAfterDays == null ? "" : String(item.maxFreeAfterDays);
    const dirty = Number(draft) !== storedDisplay || daysDraft.trim() !== storedDays;
    const busy = savingId === item.id;
    return (
      <tr key={item.id} className="border-t align-middle">
        <td className="p-3 font-mono text-sm font-bold text-slate-500">{index + 1}</td>
        <td className="p-3">
          <CountryFlag iso2={item.countryIso2} className="h-4 w-6 rounded-sm shadow-sm" />
        </td>
        <td className="p-3">
          <p className="font-semibold text-[#0b1f4b]">{item.label}</p>
          <p className="text-xs text-slate-500">{item.iata}</p>
        </td>
        <td className="p-3">{item.country}</td>
        <td className="p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-500">{symbol}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              aria-label={`Max delivery for ${item.label} (${currency})`}
              className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(item.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveRow(item.id);
                }
              }}
            />
          </div>
        </td>
        <td className="p-3">
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-label={`Free after days for ${item.label}`}
            placeholder="—"
            className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            value={daysDraft}
            disabled={busy}
            onChange={(e) => setDaysDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveRow(item.id);
              }
            }}
          />
        </td>
        <td className="p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleActive(item)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {item.isActive ? phrase("Active", "აქტიური", "Активно") : phrase("Inactive", "არააქტიური", "Неактивно")}
          </button>
        </td>
        <td className="p-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              className={`text-sm font-bold ${
                dirty ? "text-emerald-700" : "text-sky-700"
              } disabled:opacity-50`}
              onClick={() => void saveRow(item.id)}
            >
              {busy ? phrase("Saving…", "ინახება…", "Сохранение…") : phrase("Save", "შენახვა", "Сохранить")}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-red-600"
              disabled={busy}
              onClick={() => void remove(item.id)}
            >
              {phrase("Delete", "წაშლა", "Удалить")}
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderMobileCard = (item: DeliveryLocationView, index: number) => {
    const draft = priceDrafts[item.id] ?? toDisplayAmount(item.maxDeliveryPriceEur, currency, rates);
    const storedDisplay = roundMoney(convertFromEur(item.maxDeliveryPriceEur, currency, rates));
    const daysDraft = daysDrafts[item.id] ?? (item.maxFreeAfterDays == null ? "" : String(item.maxFreeAfterDays));
    const storedDays = item.maxFreeAfterDays == null ? "" : String(item.maxFreeAfterDays);
    const dirty = Number(draft) !== storedDisplay || daysDraft.trim() !== storedDays;
    const busy = savingId === item.id;
    return (
      <MobileDataCard key={item.id}>
        <MobileDataRow label="#">
          <span className="font-mono text-sm font-bold text-slate-500">{index + 1}</span>
        </MobileDataRow>
        <MobileDataRow label={phrase("Airport", "აეროპორტი", "Аэропорт")}>
          <div className="flex items-center justify-end gap-2 text-end">
            <CountryFlag iso2={item.countryIso2} className="h-4 w-6 rounded-sm shadow-sm" />
            <div>
              <p className="font-semibold text-[#0b1f4b]">{item.label}</p>
              <p className="text-xs font-medium text-slate-500">{item.iata}</p>
            </div>
          </div>
        </MobileDataRow>
        <MobileDataRow label={phrase("Country", "ქვეყანა", "Страна")}>{item.country}</MobileDataRow>
        <MobileDataRow label={`${phrase("Max delivery", "მაქს. მიწოდება", "Макс. доставка")} ${symbol}`}>
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-sm font-semibold text-slate-500">{symbol}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              aria-label={`Max delivery for ${item.label} (${currency})`}
              className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(item.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveRow(item.id);
                }
              }}
            />
          </div>
        </MobileDataRow>
        <MobileDataRow label={phrase("Free after days", "უფასო დღის შემდეგ", "Бесплатно после дней")}>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-label={`Free after days for ${item.label}`}
            placeholder="—"
            className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            value={daysDraft}
            disabled={busy}
            onChange={(e) => setDaysDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveRow(item.id);
              }
            }}
          />
        </MobileDataRow>
        <MobileDataRow label={phrase("Status", "სტატუსი", "Статус")}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleActive(item)}
            className={`min-h-11 rounded-full px-3 text-xs font-bold ${
              item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {item.isActive ? phrase("Active", "აქტიური", "Активно") : phrase("Inactive", "არააქტიური", "Неактивно")}
          </button>
        </MobileDataRow>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={busy}
            className={`min-h-11 flex-1 rounded-md px-3 text-sm font-bold ${
              dirty ? "text-emerald-700" : "text-sky-700"
            } disabled:opacity-50`}
            onClick={() => void saveRow(item.id)}
          >
            {busy ? phrase("Saving…", "ინახება…", "Сохранение…") : phrase("Save", "შენახვა", "Сохранить")}
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-md px-3 text-sm font-semibold text-red-600"
            disabled={busy}
            onClick={() => void remove(item.id)}
          >
            {phrase("Delete", "წაშლა", "Удалить")}
          </button>
        </div>
      </MobileDataCard>
    );
  };

  return (
    <div className="space-y-8">
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <button
          type="button"
          aria-pressed={!countryIso2}
          onClick={() => setCountryIso2("")}
          className={`min-h-11 shrink-0 rounded-xl border px-4 text-base font-bold ${
            !countryIso2
              ? "border-[#0b1f4b] bg-[#0b1f4b] text-white"
              : "border-slate-300 bg-white text-[#0b1f4b] hover:bg-slate-50"
          }`}
        >
          {phrase("All", "ყველა", "Все")}
        </button>
        <DeliveryCountryFilter
          countries={countries}
          valueIso2={countryIso2}
          onChange={setCountryIso2}
          label={phrase("Country", "ქვეყანა", "Страна")}
          allLabel={phrase("All", "ყველა", "Все")}
          searchLabel={phrase("Search country", "მოძებნეთ ქვეყანა", "Найти страну")}
          emptyLabel={phrase("No matching country", "ქვეყანა ვერ მოიძებნა", "Страна не найдена")}
        />
      </div>

      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="w-12 p-3">#</th>
                  <th className="w-14 p-3" aria-label="Country flag" />
                  <th className="p-3">{phrase("Airport", "აეროპორტი", "Аэропорт")}</th>
                  <th className="p-3">{phrase("Country", "ქვეყანა", "Страна")}</th>
                  <th className="p-3">
                    <span className="inline-flex items-center gap-2">
                      {phrase("Max delivery", "მაქს. მიწოდება", "Макс. доставка")}
                      <CurrencyToggle value={currency} onChange={switchCurrency} />
                    </span>
                  </th>
                  <th className="p-3">{phrase("Free after days", "უფასო დღის შემდეგ", "Бесплатно после дней")}</th>
                  <th className="p-3">{phrase("Status", "სტატუსი", "Статус")}</th>
                  <th className="p-3">{phrase("Actions", "მოქმედებები", "Действия")}</th>
                </tr>
              </thead>
              <tbody>
                {activeLocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      {countryIso2
                        ? phrase(
                            "No locations for this country.",
                            "ამ ქვეყანაში ლოკაცია არ არის.",
                            "Для этой страны локаций нет.",
                          )
                        : phrase(
                            "No active delivery locations.",
                            "აქტიური ლოკაცია არ არის.",
                            "Активных локаций нет.",
                          )}
                    </td>
                  </tr>
                ) : (
                  activeLocations.map((item, index) => renderRow(item, index))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          <>
            <div className="mb-2 flex items-center justify-end">
              <CurrencyToggle value={currency} onChange={switchCurrency} />
            </div>
            {activeLocations.length === 0 ? (
              <p className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
                {countryIso2
                  ? phrase(
                      "No locations for this country.",
                      "ამ ქვეყანაში ლოკაცია არ არის.",
                      "Для этой страны локаций нет.",
                    )
                  : phrase(
                      "No active delivery locations.",
                      "აქტიური ლოკაცია არ არის.",
                      "Активных локаций нет.",
                    )}
              </p>
            ) : (
              activeLocations.map((item, index) => renderMobileCard(item, index))
            )}
          </>
        }
      />

      {inactiveLocations.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            className="text-sm font-bold text-slate-700 hover:text-[#0b1f4b]"
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive
              ? phrase("Hide inactive locations", "არააქტიურის დამალვა", "Скрыть неактивные")
              : phrase("Show inactive locations", "არააქტიურის ჩვენება", "Показать неактивные")}{" "}
            ({inactiveLocations.length})
          </button>
          {showInactive ? (
            <ResponsiveDataList
              className="mt-3"
              desktop={
                <div className="overflow-x-auto rounded-xl border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="w-12 p-3">#</th>
                        <th className="w-14 p-3" aria-label="Country flag" />
                        <th className="p-3">{phrase("Airport", "აეროპორტი", "Аэропорт")}</th>
                        <th className="p-3">{phrase("Country", "ქვეყანა", "Страна")}</th>
                        <th className="p-3">{phrase("Max delivery", "მაქს. მიწოდება", "Макс. доставка")} {symbol}</th>
                        <th className="p-3">{phrase("Free after days", "უფასო დღის შემდეგ", "Бесплатно после дней")}</th>
                        <th className="p-3">{phrase("Status", "სტატუსი", "Статус")}</th>
                        <th className="p-3">{phrase("Actions", "მოქმედებები", "Действия")}</th>
                      </tr>
                    </thead>
                    <tbody>{inactiveLocations.map((item, index) => renderRow(item, index))}</tbody>
                  </table>
                </div>
              }
              mobile={inactiveLocations.map((item, index) => renderMobileCard(item, index))}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
