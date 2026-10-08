"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import { PARTNER_BASE } from "@/lib/routes";
import { capFreeAfterDays, type DeliveryLocationView } from "@/lib/delivery/pricing";
import { PartnerEurMoneyInput } from "@/components/partner/partner-eur-money-input";
import { cn } from "@/lib/utils";

type RowState = {
  location: DeliveryLocationView;
  enabled: boolean;
  priceEur: string;
  freeAfterDays: string;
  travelHours: string;
  travelMinutes: string;
  maxDeliveryPriceEur: number;
};

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "მიწოდება",
      city: "ქალაქი",
      place: "ადგილი",
      oneWay: "ერთი მიმართულების ფასი",
      freeAfter: "უფასო … დღის შემდეგ",
      travelTime: "გზის დრო",
      hours: "სთ",
      minutes: "წთ",
      save: "შენახვა",
      saving: "ინახება…",
      saved: "შენახულია",
      empty:
        "პირად ინფოში ჯერ არც ერთი მიწოდების ლოკაცია არ გაქვთ გააქტიურებული.",
      openPersonal: "პირადი ინფო",
      help: "მიუთითეთ აყვანის/დაბრუნების ერთი მიმართულების ფასი თითოეულ ლოკაციაზე. თანხა ემატება მომხმარებლის ჯამურ ფასს.",
      errSave: "შენახვა ვერ მოხერხდა.",
      freeAfterCapped: "ადმინის მაქსიმუმია {n} დღე. უფრო გრძელი პერიოდი ჩაიწერა {n}-ად.",
      loading: "იტვირთება…",
      crossBorderTitle: "შესაძლებელი საზღვრის გადაკვეთა",
      crossBorderHelp:
        "ჩართვისას სერვისი გამოჩნდება „დამატებითი მომსახურეობის“ ჩამონათვალში — შეგიძლიათ მიუთითოთ ფასი ან მონიშნოთ როგორც უფასო.",
      crossBorderOn: "ჩართულია",
      crossBorderOff: "გამორთულია",
    };
  }
  if (locale === "ru") {
    return {
      title: "Доставка",
      city: "Город",
      place: "Место",
      oneWay: "Цена в одну сторону",
      freeAfter: "Бесплатно после … дней",
      travelTime: "Время в пути",
      hours: "ч",
      minutes: "мин",
      save: "Сохранить",
      saving: "Сохранение…",
      saved: "Сохранено",
      empty: "В личной информации ещё нет активных локаций доставки.",
      openPersonal: "Личная информация",
      help: "Укажите цену доставки/возврата в одну сторону для каждой локации. Сумма добавится к итогу клиента.",
      errSave: "Не удалось сохранить.",
      freeAfterCapped: "Максимум администратора — {n} дн. Более длинный срок записан как {n}.",
      loading: "Загрузка…",
      crossBorderTitle: "Возможен выезд за границу",
      crossBorderHelp:
        "При включении услуга появится в списке «Дополнительные услуги» — можно указать цену или отметить как бесплатную.",
      crossBorderOn: "Включено",
      crossBorderOff: "Выключено",
    };
  }
  return {
    title: "Delivery",
    city: "City",
    place: "Place",
    oneWay: "One way price",
    freeAfter: "Free after … days",
    travelTime: "Travel time",
    hours: "h",
    minutes: "min",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    empty: "No delivery locations are activated in Personal info yet.",
    openPersonal: "Personal info",
    help: "Set a one-way delivery/collection price per location. The fee is added to the customer total.",
    errSave: "Could not save.",
    freeAfterCapped: "Admin maximum is {n} days. A longer period was set to {n}.",
    loading: "Loading…",
    crossBorderTitle: "Border crossing allowed",
    crossBorderHelp:
      "When enabled, the service appears under Additional services — set a price or mark it as free.",
    crossBorderOn: "On",
    crossBorderOff: "Off",
  };
}

function cityKey(loc: DeliveryLocationView) {
  return (loc.cityName || loc.country || loc.countryIso2 || "Other").trim();
}

function placeLabel(loc: DeliveryLocationView, locale: string) {
  if (loc.kind === "city") {
    return locale === "ka" ? "ქალაქში მიწოდება" : locale === "ru" ? "Доставка по городу" : "City delivery";
  }
  return loc.label;
}

export function PartnerDeliveryPanel() {
  const { locale } = usePartnerLocale();
  const t = useMemo(() => copyFor(locale), [locale]);

  const [rows, setRows] = useState<RowState[]>([]);
  const [crossBorderEnabled, setCrossBorderEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [capNotice, setCapNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partners/delivery-prefs");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "load failed");
      setCrossBorderEnabled(Boolean(data.crossBorderEnabled));
      const items = Array.isArray(data.items) ? data.items : [];
      setRows(
        items.map(
          (item: {
            location: DeliveryLocationView;
            enabled: boolean;
            priceEur: number;
            freeAfterDays: number | null;
            travelTimeMinutes: number;
            maxDeliveryPriceEur: number;
          }) => {
            const mins = Math.max(0, Number(item.travelTimeMinutes) || 0);
            return {
              location: item.location,
              enabled: item.enabled !== false,
              priceEur: String(item.priceEur ?? 0),
              freeAfterDays: String(item.freeAfterDays ?? 0),
              travelHours: String(Math.floor(mins / 60)),
              travelMinutes: String(mins % 60),
              maxDeliveryPriceEur: Number(item.maxDeliveryPriceEur) || 0,
            };
          },
        ),
      );
    } catch {
      setError(t.errSave);
    } finally {
      setLoading(false);
    }
  }, [t.errSave]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, RowState[]>();
    for (const row of rows) {
      const key = cityKey(row.location);
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((row) => (row.location.id === id ? { ...row, ...patch } : row)));
  };

  const setFreeAfterDays = (row: RowState, raw: string) => {
    const max = row.location.maxFreeAfterDays;
    const parsed = raw === "" ? null : Math.floor(Number(raw));
    const { freeAfterDays, capped } = capFreeAfterDays(max, Number.isFinite(parsed) ? parsed : null);
    const next = freeAfterDays == null ? "" : String(freeAfterDays);
    updateRow(row.location.id, { freeAfterDays: raw === "" ? "" : next });
    if (capped && max != null) {
      setCapNotice(t.freeAfterCapped.replaceAll("{n}", String(max)));
    } else {
      setCapNotice("");
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSavedFlash(false);
    try {
      const res = await fetch("/api/partners/delivery-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crossBorderEnabled,
          prefs: rows.map((row) => ({
            deliveryLocationId: row.location.id,
            enabled: row.enabled,
            priceEur: Number(row.priceEur) || 0,
            freeAfterDays: (() => {
              const parsed = Math.max(0, Math.floor(Number(row.freeAfterDays) || 0));
              return capFreeAfterDays(row.location.maxFreeAfterDays, parsed).freeAfterDays ?? 0;
            })(),
            travelTimeMinutes:
              Math.max(0, Math.floor(Number(row.travelHours) || 0)) * 60 +
              Math.max(0, Math.floor(Number(row.travelMinutes) || 0)),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "save failed");
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
      await load();
    } catch {
      setError(t.errSave);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <main className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-600">{t.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="bg-[#3d2a6d] px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-extrabold sm:text-xl">{t.title}</h1>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-600">{t.help}</p>
        {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}
        {capNotice ? <p className="mb-3 text-sm font-medium text-amber-700">{capNotice}</p> : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#0b1f4b]">{t.crossBorderTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t.crossBorderHelp}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={crossBorderEnabled}
            onClick={() => setCrossBorderEnabled((v) => !v)}
            className={cn(
              "relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full transition-colors",
              crossBorderEnabled ? "bg-[#28a745]" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "inline-block h-6 w-6 rounded-full bg-white shadow transition-transform",
                crossBorderEnabled ? "translate-x-[1.55rem]" : "translate-x-1",
              )}
            />
            <span className="sr-only">
              {crossBorderEnabled ? t.crossBorderOn : t.crossBorderOff}
            </span>
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
            <p className="text-sm text-amber-900">{t.empty}</p>
            <Link
              href={`${PARTNER_BASE}/personal-info`}
              className="mt-3 inline-block text-sm font-bold text-[#1d6fe8] hover:underline"
            >
              {t.openPersonal}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-md:border-0 max-md:bg-transparent max-md:shadow-none">
            <ResponsiveDataList
              desktop={
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#e8f5e9] text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">{t.city}</th>
                      <th className="px-3 py-2.5">{t.place}</th>
                      <th className="px-3 py-2.5">{t.oneWay}</th>
                      <th className="px-3 py-2.5">{t.freeAfter}</th>
                      <th className="px-3 py-2.5">{t.travelTime}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([city, cityRows]) =>
                      cityRows.map((row, idx) => (
                        <tr
                          key={row.location.id}
                          className={cn(idx % 2 === 0 ? "bg-white" : "bg-[#f7fafc]", "border-t border-slate-100")}
                        >
                          <td className="px-3 py-2.5 align-middle font-bold text-[#0b1f4b]">
                            {idx === 0 ? city : ""}
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(e) => updateRow(row.location.id, { enabled: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-[#28a745]"
                              />
                              <span className="text-[#0b1f4b]">{placeLabel(row.location, locale)}</span>
                            </label>
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <PartnerEurMoneyInput
                              eurValue={row.priceEur}
                              disabled={!row.enabled}
                              onEurChange={(eur) => updateRow(row.location.id, { priceEur: eur })}
                              className="w-24 rounded-md border border-slate-200 bg-white py-1 font-bold text-slate-900 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <input
                              type="number"
                              min={0}
                              max={row.location.maxFreeAfterDays ?? undefined}
                              step={1}
                              disabled={!row.enabled}
                              value={row.freeAfterDays}
                              title={
                                row.location.maxFreeAfterDays != null
                                  ? t.freeAfterCapped.replaceAll("{n}", String(row.location.maxFreeAfterDays))
                                  : undefined
                              }
                              onChange={(e) => setFreeAfterDays(row, e.target.value)}
                              className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold disabled:opacity-50"
                            />
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                disabled={!row.enabled}
                                value={row.travelHours}
                                onChange={(e) => updateRow(row.location.id, { travelHours: e.target.value })}
                                className="w-14 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold disabled:opacity-50"
                              />
                              <span className="text-xs text-slate-500">{t.hours}</span>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                disabled={!row.enabled}
                                value={row.travelMinutes}
                                onChange={(e) => updateRow(row.location.id, { travelMinutes: e.target.value })}
                                className="w-14 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold disabled:opacity-50"
                              />
                              <span className="text-xs text-slate-500">{t.minutes}</span>
                            </div>
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              }
              mobile={
                <>
                  {grouped.map(([city, cityRows]) =>
                    cityRows.map((row) => (
                      <MobileDataCard key={row.location.id}>
                        <MobileDataRow label={t.city}>{city}</MobileDataRow>
                        <MobileDataRow label={t.place}>
                          <label className="inline-flex cursor-pointer items-center justify-end gap-2">
                            <span className="text-[#0b1f4b]">{placeLabel(row.location, locale)}</span>
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={(e) => updateRow(row.location.id, { enabled: e.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-[#28a745]"
                            />
                          </label>
                        </MobileDataRow>
                        <MobileDataRow label={t.oneWay}>
                          <PartnerEurMoneyInput
                            eurValue={row.priceEur}
                            disabled={!row.enabled}
                            onEurChange={(eur) => updateRow(row.location.id, { priceEur: eur })}
                            className="w-28 rounded-md border border-slate-200 bg-white py-1 text-end font-bold text-slate-900 disabled:opacity-50"
                          />
                        </MobileDataRow>
                        <MobileDataRow label={t.freeAfter}>
                          <input
                            type="number"
                            min={0}
                            max={row.location.maxFreeAfterDays ?? undefined}
                            step={1}
                            disabled={!row.enabled}
                            value={row.freeAfterDays}
                            title={
                              row.location.maxFreeAfterDays != null
                                ? t.freeAfterCapped.replaceAll("{n}", String(row.location.maxFreeAfterDays))
                                : undefined
                            }
                            onChange={(e) => setFreeAfterDays(row, e.target.value)}
                            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-end text-sm font-bold disabled:opacity-50"
                          />
                        </MobileDataRow>
                        <MobileDataRow label={t.travelTime}>
                          <div className="inline-flex flex-wrap items-center justify-end gap-1">
                            <input
                              type="number"
                              min={0}
                              disabled={!row.enabled}
                              value={row.travelHours}
                              onChange={(e) => updateRow(row.location.id, { travelHours: e.target.value })}
                              className="w-14 rounded-md border border-slate-200 px-2 py-1 text-end text-sm font-bold disabled:opacity-50"
                            />
                            <span className="text-xs font-medium text-slate-500">{t.hours}</span>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              disabled={!row.enabled}
                              value={row.travelMinutes}
                              onChange={(e) => updateRow(row.location.id, { travelMinutes: e.target.value })}
                              className="w-14 rounded-md border border-slate-200 px-2 py-1 text-end text-sm font-bold disabled:opacity-50"
                            />
                            <span className="text-xs font-medium text-slate-500">{t.minutes}</span>
                          </div>
                        </MobileDataRow>
                      </MobileDataCard>
                    )),
                  )}
                </>
              }
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-md bg-[#28a745] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#23923d] disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
          {savedFlash ? <span className="text-sm font-semibold text-emerald-700">{t.saved}</span> : null}
        </div>
      </main>
    </div>
  );
}
