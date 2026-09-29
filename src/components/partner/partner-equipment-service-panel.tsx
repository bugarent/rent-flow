"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pencil, Plus, X } from "lucide-react";
import type { ExtraServicePricing } from "@/lib/extras/pricing";
import {
  capPartnerMaxPeriod,
  clampPartnerDailyPrice,
  isMandatoryFreeExtra,
  isPeriodForcedFreeExtra,
  optionalPeriodMoney,
} from "@/lib/extras/pricing";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { knownText } from "@/lib/i18n/known-record-text";
import {
  PartnerExtraCarPicker,
  type PartnerExtraCarOption,
} from "@/components/partner/partner-extra-car-picker";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import { cn, formatAmountNumber } from "@/lib/utils";

type OfferMode = "on" | "forbidden" | "off";

type RowState = {
  service: ExtraServicePricing;
  mode: OfferMode;
  priceEur: string;
  /** Minimum total when the customer selects the service. Empty = no floor. */
  minPeriodEur: string;
  /** Maximum total for the rental. Empty = no ceiling. */
  maxPeriodEur: string;
  /** Admin daily floor. Null = 0. */
  adminMinDaily: number | null;
  /** Admin daily ceiling. Null = partner daily price is not capped. */
  adminMaxDaily: number | null;
  carIds: string[];
};

function clampDailyInput(value: string, min: number | null, max: number | null) {
  const n = Number(value);
  const price = clampPartnerDailyPrice(min, max, Number.isFinite(n) ? n : (min ?? 0));
  const cappedHigh = Number.isFinite(n) && max != null && n > max + 0.0001;
  const cappedLow = Number.isFinite(n) && n + 0.0001 < (min ?? 0);
  return { value: String(price), capped: cappedHigh || cappedLow, max, min };
}

function clampPeriodInput(value: string, adminMax: number | null) {
  if (value.trim() === "") return { value: "", capped: false, max: adminMax };
  const parsed = optionalPeriodMoney(value);
  if (parsed == null) return { value, capped: false, max: adminMax };
  const { maxPeriodEur, capped } = capPartnerMaxPeriod(adminMax, parsed);
  return {
    value: maxPeriodEur == null ? "" : String(maxPeriodEur),
    capped,
    max: adminMax,
  };
}

function periodsConflict(min: string, max: string) {
  const minN = optionalPeriodMoney(min);
  const maxN = optionalPeriodMoney(max);
  return minN != null && maxN != null && minN > maxN;
}

function modeFromFlags(enabled: boolean, forbidden: boolean, mandatory: boolean): OfferMode {
  if (mandatory) return "on";
  if (forbidden) return "forbidden";
  if (enabled) return "on";
  return "off";
}

function uiCopy(locale: string) {
  if (locale === "ka") {
    return {
      colService: "მომსახურება და აღჭურვილობა",
      colPrice: "ფასი დღეში",
      colMin: "მინ. არჩევისას",
      colMax: "მაქს. გამოყენებისას",
      dailyHint: "ერთი დღის ფასი. ჯამი ითვლება არჩეული დღეების რაოდენობით.",
      minHint: "სერვისის არჩევისას ჯამი ამაზე ნაკლები არ იქნება.",
      maxHint: "რამდენი დღეც არ უნდა იყოს, ჯამი ამას არ გადააჭარბებს.",
      boundsError: "მინიმუმი მაქსიმუმზე მეტი არ უნდა იყოს.",
      colCars: "მანქანები",
      edit: "რედაქტირება",
      add: "+ დამატება",
      save: "შენახვა",
      saving: "ინახება…",
      saved: "შენახულია",
      back: "უკან",
      settings: "პარამეტრები",
      cars: "მანქანები",
      selectAll: "ყველას მონიშვნა",
      reset: "გაუქმება",
      free: "უფასო",
      status: "სტატუსი",
      on: "ჩართული",
      forbidden: "აკრძალულია",
      off: "გამორთული",
      name: "დასახელება",
      description: "აღწერა",
      delete: "წაშლა",
      breadcrumb: "დამატებითი მომსახურეობა",
      empty: "მომსახურება ჯერ არ არის.",
      carsCount: "{n} მანქანა",
      help: "მიუთითეთ დღის ფასი, მინიმუმი არჩევისას და მაქსიმუმი გამოყენებისას. ჯამი = დღის ფასი × დღეები, შემდეგ მინიმუმამდე აწევა და მაქსიმუმამდე შეზღუდვა. დღიური 0 → ცხრილში €0 და მინ/მაქს ტირეები.",
      maxCapNotice: "ამ სერვისის მაქსიმალური ღირებულება არის €{n}",
      dailyRangeNotice:
        "დღიური ფასი €{min}-დან €{max}-მდე შეიძლება. სხვა რიცხვი ავტომატურად ამ ფარგლებში ჩაიწერება.",
      maxPeriodCapNotice: "მაქს. გამოყენებისას ადმინის ჭერია €{n}. მეტი ავტომატურად ჩაიწერება €{n}-ად.",
      freeLocked: "უფასო სერვისი — დღიური ფასის დაწესება შეუძლებელია",
      periodFreeHint: "ადმინმა მაქს. პერიოდი €0 მიუთითა — სერვისი უფასოა. შეგიძლიათ ჩართოთ ან გამორთოთ.",
      dailyZeroHint: "დღიური 0: ცხრილში ჩანს €0, მინ/მაქს — ტირეები (უფუნქციო).",
      adminCap: "ადმინის მაქს. €{n}",
      adminDailyCap: "ადმინის ზღვარი €{min}–€{max}",
      adminDailyMaxOnly: "ადმინის მაქს. €{n}",
      adminNoCap: "ზღვარი არ არის",
    };
  }
  if (locale === "ru") {
    return {
      colService: "Оборудование и услуги",
      colPrice: "Цена в день",
      colMin: "Мин. при выборе",
      colMax: "Макс. за аренду",
      dailyHint: "Цена за один день. Сумма считается по числу выбранных дней.",
      minHint: "При выборе услуги сумма не будет ниже этого.",
      maxHint: "Сколько бы дней ни было, сумма не превысит это.",
      boundsError: "Минимум не может быть больше максимума.",
      colCars: "Автомобили",
      edit: "Изменить",
      add: "+ Добавить",
      save: "Сохранить",
      saving: "Сохранение…",
      saved: "Сохранено",
      back: "Назад",
      settings: "Настройки",
      cars: "Автомобили",
      selectAll: "Выбрать все",
      reset: "Сбросить",
      free: "Бесплатно",
      status: "Статус",
      on: "Включено",
      forbidden: "Запрещено",
      off: "Выключено",
      name: "Название",
      description: "Описание",
      delete: "Удалить",
      breadcrumb: "Доп. услуги",
      empty: "Услуг пока нет.",
      carsCount: "{n} авто",
      help: "Укажите цену за день, минимум при выборе и максимум за аренду. Сумма = цена × дни, затем пол до минимума и потолок до максимума. Дневной 0 → в таблице €0, мин/макс — тире.",
      maxCapNotice: "Максимальная стоимость этой услуги — €{n}",
      dailyRangeNotice: "Дневная цена может быть от €{min} до €{max}. Другое число запишется в эти границы.",
      maxPeriodCapNotice: "Максимум администратора за аренду — €{n}. Большая сумма запишется как €{n}.",
      freeLocked: "Бесплатная услуга — дневную цену задать нельзя",
      periodFreeHint: "Админ указал макс. период €0 — услуга бесплатна. Можно включить или выключить.",
      dailyZeroHint: "Дневной 0: в таблице €0, мин/макс — тире (неактивны).",
      adminCap: "макс. админа €{n}",
      adminDailyCap: "лимит админа €{min}–€{max}",
      adminDailyMaxOnly: "макс. админа €{n}",
      adminNoCap: "лимита нет",
    };
  }
  return {
    colService: "Equipment and services",
    colPrice: "Price per day",
    colMin: "Min when selected",
    colMax: "Max for the rental",
    dailyHint: "Price for one day. The total is this price times the number of days.",
    minHint: "When the service is selected, the total will not go below this.",
    maxHint: "However many days are chosen, the total will not go above this.",
    boundsError: "The minimum cannot be higher than the maximum.",
    colCars: "Cars",
    edit: "Edit",
    add: "+ Add",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    back: "Back",
    settings: "Settings",
    cars: "Cars",
    selectAll: "Select all",
    reset: "Reset",
    free: "Free",
    status: "Status",
    on: "On",
    forbidden: "Forbidden",
    off: "Off",
    name: "Name",
    description: "Description",
    delete: "Delete",
    breadcrumb: "Additional equipment and services",
    empty: "No services yet.",
    carsCount: "{n} cars",
    help: "Set the daily price, a minimum when selected, and a maximum for the rental. Total = daily × days, then raise to the minimum and cap at the maximum. Daily 0 → table shows €0 and dashes for min/max.",
    maxCapNotice: "Maximum price for this service is €{n}",
    dailyRangeNotice: "Daily price can be €{min} to €{max}. Any other amount is saved inside that range.",
    maxPeriodCapNotice: "Admin maximum for the rental is €{n}. A higher amount is saved as €{n}.",
    freeLocked: "Free service — daily price is locked",
    periodFreeHint: "Admin set period max to €0 — this service is free. You can turn it on or off.",
    dailyZeroHint: "Daily 0: table shows €0; min/max show dashes (inactive).",
    adminCap: "admin max €{n}",
    adminDailyCap: "admin limit €{min}–€{max}",
    adminDailyMaxOnly: "admin max €{n}",
    adminNoCap: "no limit",
  };
}

function carSummary(
  carIds: string[],
  cars: PartnerExtraCarOption[],
  carsCountLabel: string,
) {
  if (!cars.length) return "—";
  const selected = cars.filter((c) => carIds.includes(c.id));
  if (!selected.length) return carsCountLabel.replace("{n}", "0");
  const names = selected
    .slice(0, 4)
    .map((c) => c.title?.trim() || `${c.make} ${c.model}`.trim() || c.id);
  const more = selected.length > 4 ? "…" : "";
  return `${carsCountLabel.replace("{n}", String(selected.length))}: ${names.join(", ")}${more}`;
}

export function PartnerEquipmentServicePanel({
  catalog,
}: {
  catalog: ExtraServicePricing[];
}) {
  const { locale } = usePartnerLocale();
  const t = useMemo(() => uiCopy(locale), [locale]);

  const [cars, setCars] = useState<PartnerExtraCarOption[]>([]);
  const [rows, setRows] = useState<RowState[]>(() =>
    catalog
      .filter((s) => s.isActive !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((service) => {
        const mandatory = isMandatoryFreeExtra(service);
        return {
          service,
          mode: mandatory ? ("on" as const) : ("off" as const),
          priceEur: mandatory
            ? "0"
            : String(
                clampPartnerDailyPrice(
                  service.minPriceEur,
                  service.maxPriceEur,
                  service.defaultPriceEur ?? service.minPriceEur ?? 0,
                ),
              ),
          minPeriodEur: "",
          maxPeriodEur: "",
          adminMinDaily: service.minPriceEur,
          adminMaxDaily: service.maxPriceEur,
          carIds: [] as string[],
        };
      }),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrice, setDraftPrice] = useState("0");
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");
  const [draftMode, setDraftMode] = useState<OfferMode>("on");
  const [draftCarIds, setDraftCarIds] = useState<string[]>([]);
  const [priceCapNotice, setPriceCapNotice] = useState("");

  useEffect(() => {
    if (!priceCapNotice) return;
    const t = window.setTimeout(() => setPriceCapNotice(""), 4000);
    return () => window.clearTimeout(t);
  }, [priceCapNotice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/partners/extras-prefs");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const fleet = Array.isArray(data.cars) ? (data.cars as PartnerExtraCarOption[]) : [];
        setCars(fleet);
        const allIds = fleet.map((c) => c.id);
        setDraftCarIds(allIds);
        if (Array.isArray(data.items)) {
          setRows(
            data.items.map(
              (item: {
                service: ExtraServicePricing;
                enabled: boolean;
                forbidden?: boolean;
                priceEur: number;
                maxPriceEur: number | null;
                minPeriodEur?: number | null;
                maxPeriodEur?: number | null;
                carIds?: string[];
              }) => {
                const mandatory = isMandatoryFreeExtra(item.service);
                const mode = modeFromFlags(
                  Boolean(item.enabled),
                  Boolean(item.forbidden),
                  mandatory,
                );
                const periodFree = isPeriodForcedFreeExtra(item.service);
                const periodCap = capPartnerMaxPeriod(item.service.maxPeriodEur, item.maxPeriodEur);
                const adminPeriod = optionalPeriodMoney(item.service.maxPeriodEur);
                const ceiling = periodCap.maxPeriodEur ?? adminPeriod;
                const minPeriod = optionalPeriodMoney(item.minPeriodEur);
                const minShown =
                  periodFree
                    ? null
                    : minPeriod != null && ceiling != null && minPeriod > ceiling
                      ? ceiling
                      : minPeriod;
                const dailyMax = item.maxPriceEur ?? item.service.maxPriceEur ?? null;
                const priceEur = String(
                  periodFree
                    ? 0
                    : clampPartnerDailyPrice(item.service.minPriceEur, dailyMax, item.priceEur ?? 0),
                );
                const dailyZero = Number(priceEur) <= 0 || periodFree || mandatory;
                return {
                  service: item.service,
                  mode,
                  priceEur,
                  // Daily 0 → period windows inactive (shown as —); keep values only when daily > 0.
                  minPeriodEur:
                    dailyZero || minShown == null || minShown <= 0 ? "" : String(minShown),
                  maxPeriodEur:
                    dailyZero || periodFree
                      ? ""
                      : periodCap.maxPeriodEur != null && periodCap.maxPeriodEur > 0
                        ? String(periodCap.maxPeriodEur)
                        : "",
                  adminMinDaily: item.service.minPriceEur,
                  adminMaxDaily: dailyMax,
                  carIds: Array.isArray(item.carIds) ? item.carIds.map(String) : allIds,
                };
              },
            ),
          );
        }
      } catch {
        /* keep SSR defaults */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const editingRow = editingId ? rows.find((r) => r.service.id === editingId) : null;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const buildPrefsPayload = (override?: { id: string; patch: Partial<RowState> }) => {
    return rowsRef.current.map((row) => {
      const merged =
        override && row.service.id === override.id ? { ...row, ...override.patch } : row;
      return {
        extraServiceId: merged.service.id,
        enabled: merged.mode === "on" || merged.mode === "forbidden",
        forbidden: merged.mode === "forbidden",
        priceEur:
          merged.mode === "forbidden" || merged.mode === "off"
            ? 0
            : isPeriodForcedFreeExtra(merged.service)
              ? 0
              : clampPartnerDailyPrice(
                  merged.adminMinDaily,
                  merged.adminMaxDaily,
                  Number(merged.priceEur),
                ),
        minPeriodEur:
          merged.mode === "forbidden" ||
          merged.mode === "off" ||
          isPeriodForcedFreeExtra(merged.service) ||
          Number(merged.priceEur) <= 0
            ? null
            : (() => {
                const cappedMax = capPartnerMaxPeriod(
                  merged.service.maxPeriodEur,
                  optionalPeriodMoney(merged.maxPeriodEur),
                ).maxPeriodEur;
                const ceiling = cappedMax ?? optionalPeriodMoney(merged.service.maxPeriodEur);
                const minPeriod = optionalPeriodMoney(merged.minPeriodEur);
                if (minPeriod != null && ceiling != null && minPeriod > ceiling) return ceiling;
                return minPeriod;
              })(),
        maxPeriodEur:
          merged.mode === "forbidden" ||
          merged.mode === "off" ||
          isPeriodForcedFreeExtra(merged.service) ||
          Number(merged.priceEur) <= 0
            ? null
            : capPartnerMaxPeriod(merged.service.maxPeriodEur, optionalPeriodMoney(merged.maxPeriodEur))
                .maxPeriodEur,
        carIds: merged.carIds,
      };
    });
  };

  const setRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((row) => (row.service.id === id ? { ...row, ...patch } : row)));
  };

  const saveAll = async () => {
    if (rowsRef.current.some((row) => row.mode === "on" && periodsConflict(row.minPeriodEur, row.maxPeriodEur))) {
      setError(t.boundsError);
      return;
    }
    setSaving(true);
    setError("");
    setSavedFlash(false);
    try {
      const res = await fetch("/api/partners/extras-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: buildPrefsPayload() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraftName("");
    setDraftDescription("");
    setDraftPrice("0");
    setDraftMin("");
    setDraftMax("");
    setDraftMode("on");
    setDraftCarIds(cars.map((c) => c.id));
    setError("");
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingId(null);
    setError("");
  };

  const saveCreate = async () => {
    const name = draftName.trim();
    if (name.length < 2) {
      setError(locale === "ka" ? "ჩაწერეთ სახელი" : locale === "ru" ? "Укажите название" : "Enter a name");
      return;
    }
    if (periodsConflict(draftMin, draftMax)) {
      setError(t.boundsError);
      return;
    }
    if (!draftCarIds.length && cars.length > 0) {
      setError(
        locale === "ka"
          ? "აირჩიეთ მინიმუმ ერთი მანქანა"
          : locale === "ru"
            ? "Выберите хотя бы один автомобиль"
            : "Select at least one car",
      );
      return;
    }
    setAdding(true);
    setError("");
    try {
      const price = Number(draftPrice);
      const res = await fetch("/api/partners/extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: draftDescription.trim(),
          priceEur: Number.isFinite(price) && price >= 0 ? price : 0,
          minPeriodEur: optionalPeriodMoney(draftMin),
          maxPeriodEur: optionalPeriodMoney(draftMax),
          mode: draftMode === "forbidden" ? "forbidden" : "on",
          carIds: draftCarIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      const service = data.service as ExtraServicePricing;
      const mode = (data.mode === "forbidden" ? "forbidden" : "on") as OfferMode;
      const carIds = Array.isArray(data.carIds) && data.carIds.length ? data.carIds : draftCarIds;
      setRows((prev) => [
        ...prev,
        {
          service,
          mode,
          priceEur: mode === "forbidden" ? "0" : String(service.defaultPriceEur ?? 0),
          minPeriodEur: draftMin,
          maxPeriodEur: draftMax,
          adminMinDaily: service.minPriceEur,
          adminMaxDaily: service.maxPriceEur,
          carIds,
        },
      ]);
      setCreating(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setAdding(false);
    }
  };

  const saveEditAndBack = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    setSavedFlash(false);
    try {
      const latest = rowsRef.current.find((r) => r.service.id === editingId);
      if (!latest) throw new Error("Service not found");
      if (latest.mode === "on" && periodsConflict(latest.minPeriodEur, latest.maxPeriodEur)) {
        setError(t.boundsError);
        setSaving(false);
        return;
      }
      const prefs = buildPrefsPayload({
        id: latest.service.id,
        patch: {
          mode: latest.mode,
          priceEur: latest.priceEur,
          minPeriodEur: latest.minPeriodEur,
          maxPeriodEur: latest.maxPeriodEur,
          carIds: [...latest.carIds],
        },
      });
      const res = await fetch("/api/partners/extras-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      // Re-sync from server so UI matches persisted carIds after refresh.
      if (Array.isArray(data.prefs)) {
        const byId = new Map(
          (data.prefs as Array<{ extraServiceId: string; carIds?: string[] }>).map((p) => [
            p.extraServiceId,
            p,
          ]),
        );
        setRows((prev) =>
          prev.map((row) => {
            const saved = byId.get(row.service.id);
            if (!saved || !Array.isArray(saved.carIds)) return row;
            return { ...row, carIds: saved.carIds.map(String) };
          }),
        );
      }
      setEditingId(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <div className="bg-[#3d2a6d] px-4 py-4 text-white">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-lg font-extrabold sm:text-xl">{t.breadcrumb}</h1>
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">…</main>
      </div>
    );
  }

  /* —— Create / Edit detail view —— */
  if (creating || editingRow) {
    const title = creating ? t.add.replace("+ ", "") : knownText(locale, editingRow!.service.name);
    const mandatory = editingRow ? isMandatoryFreeExtra(editingRow.service) : false;
    const periodFree = editingRow ? isPeriodForcedFreeExtra(editingRow.service) : false;
    const maxCap = editingRow?.adminMaxDaily ?? null;
    const adminPeriodMax = periodFree
      ? 0
      : optionalPeriodMoney(editingRow?.service.maxPeriodEur);
    // Daily lock (admin max daily ≤ 0) must NOT clear or disable min/max period windows.
    const dailyLocked = mandatory || periodFree || (maxCap != null && maxCap <= 0);
    const priceValue = creating ? draftPrice : editingRow!.priceEur;
    const dailyIsZero = dailyLocked || Number(priceValue) <= 0;
    // When daily is 0, min/max are inactive (table shows —).
    const periodLocked = mandatory || periodFree || dailyIsZero;
    const minValue = periodLocked ? "" : creating ? draftMin : editingRow!.minPeriodEur;
    const maxValue = periodLocked ? "" : creating ? draftMax : editingRow!.maxPeriodEur;
    const modeValue = creating ? draftMode : editingRow!.mode;
    const carIdsValue = creating ? draftCarIds : editingRow!.carIds;

    return (
      <div className="flex min-h-screen flex-col bg-[#eef2f7]">
        <div className="bg-[#3d2a6d] px-4 py-4 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-medium text-white/75">
              {t.breadcrumb} <span className="opacity-60">›</span> {title}
            </p>
            <h1 className="mt-1 text-lg font-extrabold sm:text-xl">{title}</h1>
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}
          {priceCapNotice ? (
            <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              {priceCapNotice}
            </p>
          ) : null}
          {periodFree && !creating ? (
            <p className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              {t.periodFreeHint}
            </p>
          ) : dailyLocked && !creating ? (
            <p className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              {t.freeLocked}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-2">
              <section className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                <h2 className="text-base font-extrabold text-[#0b1f4b]">{t.settings}</h2>

                {creating ? (
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">{t.name}</span>
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#0b1f4b]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">
                        {t.description}
                      </span>
                      <textarea
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  <label className="relative block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">{t.colPrice}</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        €
                      </span>
                      <input
                        type="number"
                        min={editingRow?.adminMinDaily ?? 0}
                        max={maxCap != null && maxCap > 0 ? maxCap : undefined}
                        step="0.01"
                        disabled={dailyLocked || modeValue !== "on"}
                        value={dailyLocked ? "0" : priceValue}
                        onChange={(e) => {
                          const result = clampDailyInput(
                            e.target.value,
                            editingRow?.adminMinDaily ?? null,
                            editingRow?.adminMaxDaily ?? null,
                          );
                          if (result.capped && result.max != null) {
                            setPriceCapNotice(
                              t.dailyRangeNotice
                                .replaceAll("{min}", formatAmountNumber(result.min ?? 0))
                                .replaceAll("{max}", formatAmountNumber(result.max)),
                            );
                          }
                          const dailyZero = Number(result.value) <= 0;
                          if (creating) {
                            setDraftPrice(result.value);
                            if (dailyZero) {
                              setDraftMin("");
                              setDraftMax("");
                            }
                          } else {
                            setRow(editingRow!.service.id, {
                              priceEur: result.value,
                              ...(dailyZero ? { minPeriodEur: "", maxPeriodEur: "" } : {}),
                            });
                          }
                        }}
                        className="w-full rounded-md border border-slate-200 py-2.5 pl-8 pr-9 text-sm font-bold text-[#0b1f4b] disabled:bg-slate-50 disabled:opacity-60"
                      />
                      {!dailyLocked && modeValue === "on" ? (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => {
                            const floor = String(
                              clampPartnerDailyPrice(
                                editingRow?.adminMinDaily,
                                editingRow?.adminMaxDaily,
                                editingRow?.adminMinDaily ?? 0,
                              ),
                            );
                            const dailyZero = Number(floor) <= 0;
                            if (creating) {
                              setDraftPrice(floor);
                              if (dailyZero) {
                                setDraftMin("");
                                setDraftMax("");
                              }
                            } else {
                              setRow(editingRow!.service.id, {
                                priceEur: floor,
                                ...(dailyZero ? { minPeriodEur: "", maxPeriodEur: "" } : {}),
                              });
                            }
                          }}
                          aria-label={t.free}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">{t.dailyHint}</p>
                    {maxCap != null && maxCap > 0 ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        {t.dailyRangeNotice
                          .replaceAll("{min}", formatAmountNumber(editingRow?.adminMinDaily ?? 0))
                          .replaceAll("{max}", formatAmountNumber(maxCap))}
                      </p>
                    ) : maxCap != null && maxCap <= 0 ? (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-800">{t.freeLocked}</p>
                    ) : Number(priceValue) <= 0 && modeValue === "on" && !dailyLocked ? (
                      <p className="mt-1 text-[11px] font-semibold text-slate-600">{t.dailyZeroHint}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">{t.colMin}</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        €
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={periodLocked || modeValue !== "on"}
                        value={periodLocked ? "" : minValue}
                        placeholder="—"
                        onChange={(e) => {
                          const result = clampPeriodInput(e.target.value, creating ? null : adminPeriodMax);
                          if (result.capped && result.max != null) {
                            setPriceCapNotice(
                              t.maxPeriodCapNotice.replaceAll("{n}", formatAmountNumber(result.max)),
                            );
                          }
                          if (creating) setDraftMin(result.value);
                          else setRow(editingRow!.service.id, { minPeriodEur: result.value });
                        }}
                        className="w-full rounded-md border border-slate-200 py-2.5 pl-8 pr-3 text-sm font-bold text-[#0b1f4b] disabled:bg-slate-50 disabled:opacity-60"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">{t.minHint}</p>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">{t.colMax}</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        €
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={adminPeriodMax ?? undefined}
                        step="0.01"
                        disabled={periodLocked || modeValue !== "on"}
                        value={periodLocked ? "" : maxValue}
                        placeholder="—"
                        onChange={(e) => {
                          const result = clampPeriodInput(e.target.value, creating ? null : adminPeriodMax);
                          if (result.capped && result.max != null) {
                            setPriceCapNotice(
                              t.maxPeriodCapNotice.replaceAll("{n}", formatAmountNumber(result.max)),
                            );
                          }
                          if (creating) setDraftMax(result.value);
                          else setRow(editingRow!.service.id, { maxPeriodEur: result.value });
                        }}
                        className="w-full rounded-md border border-slate-200 py-2.5 pl-8 pr-3 text-sm font-bold text-[#0b1f4b] disabled:bg-slate-50 disabled:opacity-60"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">{t.maxHint}</p>
                    {adminPeriodMax != null && adminPeriodMax > 0 ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        {t.maxPeriodCapNotice.replaceAll("{n}", formatAmountNumber(adminPeriodMax))}
                      </p>
                    ) : null}
                  </label>

                  {!mandatory ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-500">{t.status}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ["on", t.on, "green"],
                            ["forbidden", t.forbidden, "red"],
                            ["off", t.off, "slate"],
                          ] as const
                        ).map(([mode, label, tone]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              if (creating) {
                                setDraftMode(mode);
                                if (mode === "forbidden") {
                                  setDraftPrice("0");
                                  setDraftMin("");
                                  setDraftMax("");
                                }
                              } else {
                                setRow(editingRow!.service.id, {
                                  mode,
                                  priceEur: mode === "forbidden" ? "0" : editingRow!.priceEur,
                                  ...(mode === "forbidden"
                                    ? { minPeriodEur: "", maxPeriodEur: "" }
                                    : {}),
                                  carIds:
                                    mode !== "off" && editingRow!.carIds.length === 0
                                      ? cars.map((c) => c.id)
                                      : editingRow!.carIds,
                                });
                              }
                            }}
                            className={cn(
                              "rounded-md border px-2.5 py-1.5 text-xs font-bold transition",
                              tone === "green" &&
                                (modeValue === mode
                                  ? "border-[#28a745] bg-[#28a745] text-white"
                                  : "border-emerald-200 bg-white text-emerald-700"),
                              tone === "red" &&
                                (modeValue === mode
                                  ? "border-red-500 bg-red-600 text-white"
                                  : "border-red-200 bg-white text-red-600"),
                              tone === "slate" &&
                                (modeValue === mode
                                  ? "border-slate-600 bg-slate-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600"),
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-emerald-700">{t.free}</p>
                  )}

                  {editingRow && isCrossBorderExtra(editingRow.service) && modeValue === "on" ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-700">
                      <input
                        type="checkbox"
                        checked={Number(priceValue) <= 0}
                        onChange={(e) =>
                          setRow(editingRow.service.id, {
                            priceEur: e.target.checked ? "0" : "1",
                            ...(e.target.checked ? { minPeriodEur: "", maxPeriodEur: "" } : {}),
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      {t.free}
                    </label>
                  ) : null}
                </div>
              </section>

              <section className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-extrabold text-[#0b1f4b]">{t.cars}</h2>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <button
                      type="button"
                      className="text-[#1d6fe8] hover:underline"
                      onClick={() => {
                        const ids = cars.map((c) => c.id);
                        if (creating) setDraftCarIds(ids);
                        else setRow(editingRow!.service.id, { carIds: ids });
                      }}
                    >
                      {t.selectAll}
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:underline"
                      onClick={() => {
                        if (creating) setDraftCarIds([]);
                        else setRow(editingRow!.service.id, { carIds: [] });
                      }}
                    >
                      {t.reset}
                    </button>
                  </div>
                </div>
                <PartnerExtraCarPicker
                  cars={cars}
                  selectedIds={carIdsValue}
                  onChange={(ids) => {
                    if (creating) setDraftCarIds(ids);
                    else setRow(editingRow!.service.id, { carIds: ids });
                  }}
                  locale={locale}
                  disabled={mandatory || modeValue === "off"}
                />
              </section>
            </div>
          </div>
        </main>

        <div className="sticky bottom-0 border-t border-[#2a1d4d] bg-[#3d2a6d] px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving || adding}
              onClick={() => void (creating ? saveCreate() : saveEditAndBack())}
              className="rounded-md bg-[#28a745] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#23923d] disabled:opacity-60"
            >
              {saving || adding ? t.saving : t.save}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </button>
            {savedFlash ? <span className="text-sm font-semibold text-emerald-200">{t.saved}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  /* —— List table view —— */
  return (
    <div className="flex min-h-screen flex-col bg-[#eef2f7]">
      <div className="bg-[#3d2a6d] px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-extrabold sm:text-xl">{t.breadcrumb}</h1>
          <p className="mt-1 text-xs text-white/75">{t.help}</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {t.empty}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-md:border-0 max-md:bg-transparent max-md:shadow-none">
            <ResponsiveDataList
              desktop={
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#e8f5e9] text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">{t.colService}</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">{t.colPrice}</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">{t.colMin}</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">{t.colMax}</th>
                      <th className="px-3 py-2.5">{t.colCars}</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const mandatory = isMandatoryFreeExtra(row.service);
                      const periodFree = isPeriodForcedFreeExtra(row.service);
                      const dailyNum = Number(row.priceEur);
                      const dailyIsZero =
                        mandatory ||
                        periodFree ||
                        !Number.isFinite(dailyNum) ||
                        dailyNum <= 0;
                      const priceCell =
                        row.mode === "off" ? "—" : dailyIsZero ? "€0" : `€${formatAmountNumber(dailyNum)}`;
                      const periodCell = (raw: string) => {
                        if (row.mode !== "on" || dailyIsZero) return "—";
                        const n = optionalPeriodMoney(raw);
                        return n == null ? "—" : `€${formatAmountNumber(n)}`;
                      };
                      const adminDailyMin = row.adminMinDaily;
                      const adminDailyMax = row.adminMaxDaily;
                      const adminPeriodMax = periodFree
                        ? 0
                        : optionalPeriodMoney(row.service.maxPeriodEur);
                      const dailyCapHint =
                        row.mode === "off" || mandatory || periodFree
                          ? null
                          : adminDailyMax != null && adminDailyMax > 0
                            ? adminDailyMin != null && adminDailyMin > 0
                              ? t.adminDailyCap
                                  .replace("{min}", formatAmountNumber(adminDailyMin))
                                  .replace("{max}", formatAmountNumber(adminDailyMax))
                              : t.adminDailyMaxOnly.replace(
                                  "{n}",
                                  formatAmountNumber(adminDailyMax),
                                )
                            : adminDailyMin != null && adminDailyMin > 0
                              ? t.adminDailyCap
                                  .replace("{min}", formatAmountNumber(adminDailyMin))
                                  .replace("{max}", "…")
                              : t.adminNoCap;
                      const periodCapHint =
                        row.mode === "off" || mandatory
                          ? null
                          : periodFree
                            ? t.adminCap.replace("{n}", "0")
                            : adminPeriodMax != null && adminPeriodMax > 0
                              ? t.adminCap.replace("{n}", formatAmountNumber(adminPeriodMax))
                              : t.adminNoCap;
                      const carsLabel = carSummary(row.carIds, cars, t.carsCount);
                      const colon = carsLabel.indexOf(":");
                      return (
                        <tr
                          key={row.service.id}
                          className={cn(
                            "border-t border-slate-100",
                            idx % 2 === 0 ? "bg-white" : "bg-[#fafbfd]",
                          )}
                        >
                          <td className="px-3 py-3 align-top">
                            <p className="font-bold text-[#0b1f4b]">{knownText(locale, row.service.name)}</p>
                            {row.service.description ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {knownText(locale, row.service.description)}
                              </p>
                            ) : null}
                            {row.mode === "forbidden" ? (
                              <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                {t.forbidden}
                              </span>
                            ) : row.mode === "off" ? (
                              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                {t.off}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 align-top font-semibold text-[#0b1f4b]">
                            <div>{priceCell}</div>
                            {dailyCapHint ? (
                              <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-800/90">
                                {dailyCapHint}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 align-top text-slate-600">
                            <div>{row.mode === "off" ? "—" : periodCell(row.minPeriodEur)}</div>
                            {periodCapHint ? (
                              <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-800/90">
                                {periodCapHint}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 align-top text-slate-600">
                            <div>{row.mode === "off" ? "—" : periodCell(row.maxPeriodEur)}</div>
                            {periodCapHint ? (
                              <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-800/90">
                                {periodCapHint}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-[280px] px-3 py-3 align-top text-xs leading-snug text-slate-600">
                            {colon >= 0 ? (
                              <>
                                <span className="font-semibold text-[#0b1f4b]">
                                  {carsLabel.slice(0, colon + 1)}
                                </span>
                                {carsLabel.slice(colon + 1)}
                              </>
                            ) : (
                              carsLabel
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            <button
                              type="button"
                              onClick={() => setEditingId(row.service.id)}
                              className="inline-flex items-center gap-1 text-sm font-bold text-[#1d6fe8] hover:underline"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t.edit}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              }
              mobile={
                <>
                  {rows.map((row) => {
                    const mandatory = isMandatoryFreeExtra(row.service);
                    const periodFree = isPeriodForcedFreeExtra(row.service);
                    const dailyNum = Number(row.priceEur);
                    const dailyIsZero =
                      mandatory ||
                      periodFree ||
                      !Number.isFinite(dailyNum) ||
                      dailyNum <= 0;
                    const priceCell =
                      row.mode === "off" ? "—" : dailyIsZero ? "€0" : `€${formatAmountNumber(dailyNum)}`;
                    const periodCell = (raw: string) => {
                      if (row.mode !== "on" || dailyIsZero) return "—";
                      const n = optionalPeriodMoney(raw);
                      return n == null ? "—" : `€${formatAmountNumber(n)}`;
                    };
                    const adminDailyMin = row.adminMinDaily;
                    const adminDailyMax = row.adminMaxDaily;
                    const adminPeriodMax = periodFree
                      ? 0
                      : optionalPeriodMoney(row.service.maxPeriodEur);
                    const dailyCapHint =
                      row.mode === "off" || mandatory || periodFree
                        ? null
                        : adminDailyMax != null && adminDailyMax > 0
                          ? adminDailyMin != null && adminDailyMin > 0
                            ? t.adminDailyCap
                                .replace("{min}", formatAmountNumber(adminDailyMin))
                                .replace("{max}", formatAmountNumber(adminDailyMax))
                            : t.adminDailyMaxOnly.replace(
                                "{n}",
                                formatAmountNumber(adminDailyMax),
                              )
                          : adminDailyMin != null && adminDailyMin > 0
                            ? t.adminDailyCap
                                .replace("{min}", formatAmountNumber(adminDailyMin))
                                .replace("{max}", "…")
                            : t.adminNoCap;
                    const periodCapHint =
                      row.mode === "off" || mandatory
                        ? null
                        : periodFree
                          ? t.adminCap.replace("{n}", "0")
                          : adminPeriodMax != null && adminPeriodMax > 0
                            ? t.adminCap.replace("{n}", formatAmountNumber(adminPeriodMax))
                            : t.adminNoCap;
                    const carsLabel = carSummary(row.carIds, cars, t.carsCount);
                    const colon = carsLabel.indexOf(":");
                    return (
                      <MobileDataCard key={row.service.id}>
                        <MobileDataRow label={t.colService}>
                          <div className="text-end">
                            <p className="font-bold text-[#0b1f4b]">{knownText(locale, row.service.name)}</p>
                            {row.service.description ? (
                              <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-500">
                                {knownText(locale, row.service.description)}
                              </p>
                            ) : null}
                            {row.mode === "forbidden" ? (
                              <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                {t.forbidden}
                              </span>
                            ) : row.mode === "off" ? (
                              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                {t.off}
                              </span>
                            ) : null}
                          </div>
                        </MobileDataRow>
                        <MobileDataRow label={t.colPrice}>
                          <div className="text-end">
                            <div>{priceCell}</div>
                            {dailyCapHint ? (
                              <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-800/90">
                                {dailyCapHint}
                              </p>
                            ) : null}
                          </div>
                        </MobileDataRow>
                        <MobileDataRow label={t.colMin}>
                          <div className="text-end">
                            <div>{row.mode === "off" ? "—" : periodCell(row.minPeriodEur)}</div>
                            {periodCapHint ? (
                              <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-800/90">
                                {periodCapHint}
                              </p>
                            ) : null}
                          </div>
                        </MobileDataRow>
                        <MobileDataRow label={t.colMax}>
                          <div className="text-end">
                            <div>{row.mode === "off" ? "—" : periodCell(row.maxPeriodEur)}</div>
                            {periodCapHint ? (
                              <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-800/90">
                                {periodCapHint}
                              </p>
                            ) : null}
                          </div>
                        </MobileDataRow>
                        <MobileDataRow label={t.colCars}>
                          <span className="text-xs leading-snug">
                            {colon >= 0 ? (
                              <>
                                <span className="font-semibold text-[#0b1f4b]">
                                  {carsLabel.slice(0, colon + 1)}
                                </span>
                                {carsLabel.slice(colon + 1)}
                              </>
                            ) : (
                              carsLabel
                            )}
                          </span>
                        </MobileDataRow>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(row.service.id)}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-[#1d6fe8]/30 bg-[#1d6fe8]/5 px-3 text-sm font-bold text-[#1d6fe8]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t.edit}
                          </button>
                        </div>
                      </MobileDataCard>
                    );
                  })}
                </>
              }
            />
          </div>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-[#2a1d4d] bg-[#3d2a6d] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#28a745] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#23923d]"
          >
            <Plus className="h-4 w-4" />
            {t.add.replace("+ ", "")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveAll()}
            className="rounded-md bg-white/15 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
          {savedFlash ? <span className="text-sm font-semibold text-emerald-200">{t.saved}</span> : null}
        </div>
      </div>
    </div>
  );
}
