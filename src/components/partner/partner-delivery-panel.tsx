"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import { PARTNER_BASE } from "@/lib/routes";
import { capFreeAfterDays, type DeliveryLocationView } from "@/lib/delivery/pricing";
import { PartnerDeliveryPriceCell } from "@/components/partner/partner-delivery-price-cell";
import { cn } from "@/lib/utils";
import { worldCountryName } from "@/lib/catalog/world-countries";

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
      days: "დღე",
      minutes: "წთ",
      save: "შენახვა",
      saving: "ინახება…",
      saved: "შენახულია",
      emptyCountries:
        "პირად ინფოში ჯერ არც ერთი ოპერირების ქვეყანა არ გაქვთ არჩეული.",
      emptyLocations: "ამ ქვეყნებისთვის კატალოგში ლოკაციები ჯერ არ არის.",
      openPersonal: "პირადი ინფო",
      help: "ჩართეთ ლოკაციები თქვენი ოპერირების ქვეყნიდან. ჩართული ლოკაციები ზემოთ ჩანს ფასებით; გამორთულები — ქვემოთ. ფასი (0 = უფასო) ემატება განცხადებებს ცალკე აყვანისა და დაბრუნებისთვის.",
      free: "უფასო",
      maxHint: "მაქს. {amount}",
      priceCapped: "ადმინის ლიმიტია {amount}. ფასი ჩამოიწია ლიმიტამდე.",
      errSave: "შენახვა ვერ მოხერხდა. შენახული ფასები არ შეცვლილა — სცადეთ ხელახლა.",
      errLoad: "მიწოდების ფასები ვერ ჩაიტვირთა. განაახლეთ გვერდი.",
      freeAfterCapped: "ადმინის მაქსიმუმია {n} დღე. უფრო გრძელი პერიოდი ჩაიწერა {n}-ად.",
      loading: "იტვირთება…",
      crossBorderTitle: "შესაძლებელი საზღვრის გადაკვეთა",
      crossBorderHelp:
        "ჩართვისას სერვისი გამოჩნდება „დამატებითი მომსახურეობის“ ჩამონათვალში — შეგიძლიათ მიუთითოთ ფასი ან მონიშნოთ როგორც უფასო.",
      crossBorderOn: "ჩართულია",
      crossBorderOff: "გამორთულია",
      activeTitle: "აქტიური ლოკაციები",
      activeHelp: "ჩართული ადგილები ფასებით და დროით.",
      inactiveTitle: "გამორთული ლოკაციები",
      inactiveHelp: "გააქტიურებისას გადმოვა ზედა სექციაში.",
      inactiveCount: "{n} ლოკაცია",
      statusOn: "ჩართული",
      statusOff: "გამორთული",
      toggling: "ინახება…",
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
      days: "дн.",
      minutes: "мин",
      save: "Сохранить",
      saving: "Сохранение…",
      saved: "Сохранено",
      emptyCountries: "В личной информации ещё не выбрана страна операций.",
      emptyLocations: "В каталоге пока нет локаций для этих стран.",
      openPersonal: "Личная информация",
      help: "Включайте локации вашей страны операций. Включённые — сверху с ценами; выключенные — снизу. Цена (0 = бесплатно) добавляется к объявлениям отдельно за подачу и возврат.",
      free: "Бесплатно",
      maxHint: "макс. {amount}",
      priceCapped: "Лимит администратора — {amount}. Цена снижена до лимита.",
      errSave: "Не удалось сохранить. Сохранённые цены не изменились — попробуйте ещё раз.",
      errLoad: "Не удалось загрузить цены доставки. Обновите страницу.",
      freeAfterCapped: "Максимум администратора — {n} дн. Более длинный срок записан как {n}.",
      loading: "Загрузка…",
      crossBorderTitle: "Возможен выезд за границу",
      crossBorderHelp:
        "При включении услуга появится в списке «Дополнительные услуги» — можно указать цену или отметить как бесплатную.",
      crossBorderOn: "Включено",
      crossBorderOff: "Выключено",
      activeTitle: "Активные локации",
      activeHelp: "Включённые места с ценами и временем в пути.",
      inactiveTitle: "Выключенные локации",
      inactiveHelp: "После включения появятся в верхней секции.",
      inactiveCount: "{n} локаций",
      statusOn: "Вкл",
      statusOff: "Выкл",
      toggling: "Сохранение…",
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
    days: "days",
    minutes: "min",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    emptyCountries: "No operating country is selected in Personal info yet.",
    emptyLocations: "No catalog locations are available for your operating countries yet.",
    openPersonal: "Personal info",
    help: "Turn on locations in your operating country. Active locations appear at the top with pricing; inactive ones are listed below. Price (0 = free) is added to listings separately for pick-up and return.",
    free: "Free",
    maxHint: "max {amount}",
    priceCapped: "Admin limit is {amount}. The price was lowered to the limit.",
    errSave: "Could not save. Your saved prices were not changed — please try again.",
    errLoad: "Delivery prices could not be loaded. Please refresh the page.",
    freeAfterCapped: "Admin maximum is {n} days. A longer period was set to {n}.",
    loading: "Loading…",
    crossBorderTitle: "Border crossing allowed",
    crossBorderHelp:
      "When enabled, the service appears under Additional services — set a price or mark it as free.",
    crossBorderOn: "On",
    crossBorderOff: "Off",
    activeTitle: "Active locations",
    activeHelp: "Locations you serve, with price and travel time.",
    inactiveTitle: "Inactive locations",
    inactiveHelp: "Turn a location on to move it up and set pricing.",
    inactiveCount: "{n} locations",
    statusOn: "On",
    statusOff: "Off",
    toggling: "Saving…",
  };
}

type PanelItem = {
  location: DeliveryLocationView;
  enabled: boolean;
  priceEur: number;
  freeAfterDays: number | null;
  travelTimeMinutes: number;
  maxDeliveryPriceEur: number;
};

function rowsFromItems(items: unknown): RowState[] {
  if (!Array.isArray(items)) return [];
  return (items as PanelItem[]).map((item) => {
    const mins = Math.max(0, Number(item.travelTimeMinutes) || 0);
    return {
      location: item.location,
      enabled: item.enabled === true,
      priceEur: String(item.priceEur ?? 0),
      freeAfterDays: String(item.freeAfterDays ?? 0),
      travelHours: String(Math.floor(mins / 60)),
      travelMinutes: String(mins % 60),
      maxDeliveryPriceEur: Number(item.maxDeliveryPriceEur) || 0,
    };
  });
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

function prefsPayload(rows: RowState[]) {
  return rows.map((row) => ({
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
  }));
}

function StatusSwitch({
  checked,
  disabled,
  onLabel,
  offLabel,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-[#28a745]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[1.55rem]" : "translate-x-1",
        )}
      />
      <span className="sr-only">{checked ? onLabel : offLabel}</span>
    </button>
  );
}

export function PartnerDeliveryPanel() {
  const { locale } = usePartnerLocale();
  const t = useMemo(() => copyFor(locale), [locale]);

  const [rows, setRows] = useState<RowState[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [crossBorderEnabled, setCrossBorderEnabled] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [capNotice, setCapNotice] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners/delivery-prefs", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "load failed");
        if (cancelled) return;
        setCrossBorderEnabled(Boolean(data.crossBorderEnabled));
        setCountries(Array.isArray(data.countries) ? data.countries.map(String) : []);
        setRows(rowsFromItems(data.items));
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRows = useMemo(() => rows.filter((r) => r.enabled), [rows]);
  const inactiveRows = useMemo(() => rows.filter((r) => !r.enabled), [rows]);

  const groupRows = (list: RowState[]) => {
    const map = new Map<string, RowState[]>();
    for (const row of list) {
      const key = cityKey(row.location);
      const bucket = map.get(key) || [];
      bucket.push(row);
      map.set(key, bucket);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const activeGrouped = useMemo(() => groupRows(activeRows), [activeRows]);
  const inactiveGrouped = useMemo(() => groupRows(inactiveRows), [inactiveRows]);

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

  const persist = async (nextRows: RowState[], nextCrossBorder = crossBorderEnabled) => {
    const res = await fetch("/api/partners/delivery-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crossBorderEnabled: nextCrossBorder,
        prefs: prefsPayload(nextRows),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data?.items)) {
      throw new Error("save failed");
    }
    setRows(rowsFromItems(data.items));
    if (Array.isArray(data.countries)) setCountries(data.countries.map(String));
    if (typeof data.crossBorderEnabled === "boolean") setCrossBorderEnabled(data.crossBorderEnabled);
    return data;
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSavedFlash(false);
    try {
      await persist(rows);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setError(t.errSave);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    const snapshot = rows;
    const nextRows = rows.map((row) => (row.location.id === id ? { ...row, enabled } : row));
    setRows(nextRows);
    setTogglingId(id);
    setError("");
    try {
      await persist(nextRows);
      if (enabled) setInactiveOpen(false);
    } catch {
      setRows(snapshot);
      setError(t.errSave);
    } finally {
      setTogglingId(null);
    }
  };

  const toggleCrossBorder = async () => {
    const next = !crossBorderEnabled;
    setCrossBorderEnabled(next);
    setError("");
    try {
      await persist(rows, next);
    } catch {
      setCrossBorderEnabled(!next);
      setError(t.errSave);
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

  const renderActiveDesktop = () => (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-[#e8f5e9] text-xs font-bold uppercase tracking-wide text-slate-600">
        <tr>
          <th className="px-3 py-2.5">{t.city}</th>
          <th className="px-3 py-2.5">{t.place}</th>
          <th className="px-3 py-2.5 w-24">{t.statusOn}</th>
          <th className="px-3 py-2.5">{t.oneWay}</th>
          <th className="px-3 py-2.5">{t.freeAfter}</th>
          <th className="px-3 py-2.5">{t.travelTime}</th>
        </tr>
      </thead>
      <tbody>
        {activeGrouped.map(([city, cityRows]) =>
          cityRows.map((row, idx) => (
            <tr
              key={row.location.id}
              className={cn(idx % 2 === 0 ? "bg-white" : "bg-[#f7fafc]", "border-t border-slate-100")}
            >
              <td className="px-3 py-2.5 align-middle font-bold text-[#0b1f4b]">
                {idx === 0 ? city : ""}
              </td>
              <td className="px-3 py-2.5 align-middle text-[#0b1f4b]">
                <div className="min-w-0">
                  <p className="font-semibold">{placeLabel(row.location, locale)}</p>
                  {row.location.countryIso2 ? (
                    <p className="text-[11px] font-medium text-slate-500">
                      {worldCountryName(row.location.countryIso2)}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2.5 align-middle">
                <StatusSwitch
                  checked={row.enabled}
                  disabled={togglingId === row.location.id}
                  onLabel={t.statusOn}
                  offLabel={t.statusOff}
                  onChange={(next) => void toggleEnabled(row.location.id, next)}
                />
              </td>
              <td className="px-3 py-2.5 align-middle">
                <PartnerDeliveryPriceCell
                  priceEur={row.priceEur}
                  maxDeliveryPriceEur={row.maxDeliveryPriceEur}
                  disabled={!row.enabled}
                  freeLabel={t.free}
                  maxLabel={t.maxHint}
                  onPriceChange={(eur) => updateRow(row.location.id, { priceEur: eur })}
                  onCapped={(max) => setCapNotice(t.priceCapped.replaceAll("{amount}", max))}
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
                <span className="ml-1 text-xs text-slate-500">{t.days}</span>
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
  );

  const renderActiveMobile = () => (
    <>
      {activeGrouped.map(([city, cityRows]) =>
        cityRows.map((row) => (
          <MobileDataCard key={row.location.id}>
            <MobileDataRow label={t.city}>{city}</MobileDataRow>
            <MobileDataRow label={t.place}>
              <span className="text-end text-[#0b1f4b]">{placeLabel(row.location, locale)}</span>
            </MobileDataRow>
            <MobileDataRow label={t.statusOn}>
              <StatusSwitch
                checked={row.enabled}
                disabled={togglingId === row.location.id}
                onLabel={t.statusOn}
                offLabel={t.statusOff}
                onChange={(next) => void toggleEnabled(row.location.id, next)}
              />
            </MobileDataRow>
            <MobileDataRow label={t.oneWay}>
              <PartnerDeliveryPriceCell
                priceEur={row.priceEur}
                maxDeliveryPriceEur={row.maxDeliveryPriceEur}
                disabled={!row.enabled}
                freeLabel={t.free}
                maxLabel={t.maxHint}
                align="end"
                onPriceChange={(eur) => updateRow(row.location.id, { priceEur: eur })}
                onCapped={(max) => setCapNotice(t.priceCapped.replaceAll("{amount}", max))}
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
                onChange={(e) => setFreeAfterDays(row, e.target.value)}
                className="w-20 rounded-md border border-slate-200 px-2 py-1 text-end text-base font-bold disabled:opacity-50"
              />
              <span className="ml-1 text-xs font-medium text-slate-500">{t.days}</span>
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
  );

  const renderInactiveList = () => (
    <ul className="divide-y divide-slate-100">
      {inactiveGrouped.flatMap(([, cityRows]) =>
        cityRows.map((row) => (
          <li
            key={row.location.id}
            className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1f4b]">{placeLabel(row.location, locale)}</p>
              <p className="text-xs text-slate-500">
                {cityKey(row.location)}
                {row.location.countryIso2 ? ` · ${worldCountryName(row.location.countryIso2)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs font-semibold text-slate-500">{t.statusOff}</span>
              <StatusSwitch
                checked={false}
                disabled={togglingId === row.location.id}
                onLabel={t.statusOn}
                offLabel={t.statusOff}
                onChange={(next) => void toggleEnabled(row.location.id, next)}
              />
            </div>
          </li>
        )),
      )}
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="bg-[#3d2a6d] px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-extrabold sm:text-xl">{t.title}</h1>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="mb-4 text-sm text-slate-600">{t.help}</p>
        {error || loadFailed ? (
          <p className="mb-3 text-sm font-medium text-red-600">{error || t.errLoad}</p>
        ) : null}
        {capNotice ? <p className="mb-3 text-sm font-medium text-amber-700">{capNotice}</p> : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#0b1f4b]">{t.crossBorderTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t.crossBorderHelp}</p>
          </div>
          <StatusSwitch
            checked={crossBorderEnabled}
            onLabel={t.crossBorderOn}
            offLabel={t.crossBorderOff}
            onChange={() => void toggleCrossBorder()}
          />
        </div>

        {!countries.length && rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
            <p className="text-sm text-amber-900">{t.emptyCountries}</p>
            <Link
              href={`${PARTNER_BASE}/personal-info`}
              className="mt-3 inline-block text-sm font-bold text-[#1d6fe8] hover:underline"
            >
              {t.openPersonal}
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <p className="text-sm text-slate-700">{t.emptyLocations}</p>
            <p className="mt-1 text-xs text-slate-500">
              {countries.map((iso) => worldCountryName(iso)).join(", ")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-extrabold text-[#0b1f4b]">{t.activeTitle}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t.activeHelp}</p>
              </div>
              {activeRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">{t.inactiveHelp}</p>
              ) : (
                <div className="max-md:border-0 max-md:bg-transparent max-md:p-2 max-md:shadow-none">
                  <ResponsiveDataList desktop={renderActiveDesktop()} mobile={renderActiveMobile()} />
                </div>
              )}
            </section>

            {inactiveRows.length > 0 ? (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setInactiveOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  aria-expanded={inactiveOpen}
                >
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-[#0b1f4b]">{t.inactiveTitle}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.inactiveCount.replace("{n}", String(inactiveRows.length))} · {t.inactiveHelp}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-slate-500 transition-transform",
                      inactiveOpen && "rotate-180",
                    )}
                  />
                </button>
                {inactiveOpen ? (
                  <div className="border-t border-slate-100">{renderInactiveList()}</div>
                ) : null}
              </section>
            ) : null}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving || loadFailed || !rows.length}
            onClick={() => void save()}
            className="min-h-11 rounded-md bg-[#28a745] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#23923d] disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
          {togglingId ? <span className="text-sm font-semibold text-slate-600">{t.toggling}</span> : null}
          {savedFlash ? <span className="text-sm font-semibold text-emerald-700">{t.saved}</span> : null}
        </div>
      </main>
    </div>
  );
}
