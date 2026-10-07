"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { DateInput } from "@/components/ui/date-input";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";

type PartnerCar = {
  id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  categorySlug: string | null;
  registrationNumber: string | null;
  status: string;
};

type DiscountItem = {
  id: string;
  title: string;
  percent: number;
  kind: "discount" | "markup";
  from: string;
  to: string;
  carIds: string[];
};

type Mode = "list" | "form";

function formatDay(iso: string, locale: string) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  if (locale === "ka" || locale === "ru") return `${d}.${m}.${y}`;
  return `${d}.${m}.${y}`;
}

function carLabel(car: PartnerCar) {
  const plate = car.registrationNumber?.trim();
  const name = `${car.make} ${car.model}`.trim() || car.title;
  return plate ? `${name} ${plate}` : name;
}

function categoryLabel(slug: string | null, locale: string) {
  const key = (slug || "other").toLowerCase();
  const mapKa: Record<string, string> = {
    economy: "ეკონომი",
    compact: "კომპაქტური",
    standard: "სტანდარტული",
    suv: "ჯიპი",
    minivan: "მინივენი",
    camper: "კემპერი",
    luxury: "ლუქსი",
    other: "სხვა",
  };
  const mapEn: Record<string, string> = {
    economy: "Economy",
    compact: "Compact",
    standard: "Standard",
    suv: "SUV",
    minivan: "Minivan",
    camper: "Camper car",
    luxury: "Luxury",
    other: "Other",
  };
  const mapRu: Record<string, string> = {
    economy: "Эконом",
    compact: "Компакт",
    standard: "Стандарт",
    suv: "Внедорожник",
    minivan: "Минивэн",
    camper: "Кемпер",
    luxury: "Люкс",
    other: "Другое",
  };
  const map = locale === "ka" ? mapKa : locale === "ru" ? mapRu : mapEn;
  return map[key] || map.other;
}

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      discounts: "ფასდაკლებები",
      markups: "ფასნამატები",
      addDiscount: "ფასდაკლების დამატება",
      addMarkup: "მარკაპინგის დამატება",
      editDiscount: "ფასდაკლების რედაქტირება",
      editMarkup: "მარკაპინგის რედაქტირება",
      titleCol: "ფასდაკლების სათაური",
      amountCol: "ფასდაკლების ოდენობა",
      periodCol: "პერიოდი",
      carsCol: "მანქანები",
      actionsCol: "მოქმედება",
      markupEmpty: "მომხმარებლებს არ მოსწონთ, მაგრამ რა ვქნათ :)",
      formTitleDiscount: "ფასდაკლების დამატება",
      formTitleMarkup: "მარკაპინგის დამატება",
      formEditDiscount: "ფასდაკლების რედაქტირება",
      formEditMarkup: "მარკაპინგის რედაქტირება",
      params: "პარამეტრები",
      cars: "მანქანები",
      namePh: "ფასდაკლების სახელი",
      markupNamePh: "მარკაპინგის სახელი",
      from: "დან",
      to: "მდე",
      percentPh: "პროცენტული ფასდაკლება",
      markupPercentPh: "პროცენტული ფასნამატი",
      selectAll: "ყველას არჩევა",
      reset: "გადატვირთვა",
      save: "შენახვა",
      saving: "ინახება…",
      back: "უკან",
      delete: "წაშლა",
      carCount: (n: number) => (n === 1 ? "1 მანქანა" : `${n} მანქანა`),
      emptyDiscounts: "ფასდაკლებები ჯერ არ არის.",
      errRequired: "შეავსეთ სახელი, პროცენტი, თარიღები და მონიშნეთ მინიმუმ ერთი მანქანა.",
      errSave: "შენახვა ვერ მოხერხდა.",
      loading: "იტვირთება…",
    };
  }
  if (locale === "ru") {
    return {
      discounts: "Скидки",
      markups: "Наценки",
      addDiscount: "Добавить скидку",
      addMarkup: "Добавить наценку",
      editDiscount: "Редактировать скидку",
      editMarkup: "Редактировать наценку",
      titleCol: "Название скидки",
      amountCol: "Размер скидки",
      periodCol: "Период",
      carsCol: "Автомобили",
      actionsCol: "Действия",
      markupEmpty: "Клиентам это не нравится, но что поделать :)",
      formTitleDiscount: "Добавление скидки",
      formTitleMarkup: "Добавление наценки",
      formEditDiscount: "Редактирование скидки",
      formEditMarkup: "Редактирование наценки",
      params: "Параметры",
      cars: "Автомобили",
      namePh: "Название скидки",
      markupNamePh: "Название наценки",
      from: "С",
      to: "По",
      percentPh: "Процент скидки",
      markupPercentPh: "Процент наценки",
      selectAll: "Выбрать все",
      reset: "Сбросить",
      save: "Сохранить",
      saving: "Сохранение…",
      back: "Назад",
      delete: "Удалить",
      carCount: (n: number) => (n === 1 ? "1 авто" : `${n} авто`),
      emptyDiscounts: "Скидок пока нет.",
      errRequired: "Заполните название, процент, даты и выберите хотя бы один автомобиль.",
      errSave: "Не удалось сохранить.",
      loading: "Загрузка…",
    };
  }
  return {
    discounts: "Discounts",
    markups: "Markups",
    addDiscount: "Add discount",
    addMarkup: "Add markup",
    editDiscount: "Edit discount",
    editMarkup: "Edit markup",
    titleCol: "Discount title",
    amountCol: "Discount amount",
    periodCol: "Period",
    carsCol: "Cars",
    actionsCol: "Actions",
    markupEmpty: "Customers don't like them, but what can you do :)",
    formTitleDiscount: "Add discount",
    formTitleMarkup: "Add markup",
    formEditDiscount: "Edit discount",
    formEditMarkup: "Edit markup",
    params: "Parameters",
    cars: "Cars",
    namePh: "Discount name",
    markupNamePh: "Markup name",
    from: "From",
    to: "Until",
    percentPh: "Percentage discount",
    markupPercentPh: "Percentage markup",
    selectAll: "Select all",
    reset: "Reset",
    save: "Save",
    saving: "Saving…",
    back: "Back",
    delete: "Delete",
    carCount: (n: number) => (n === 1 ? "1 car" : `${n} cars`),
    emptyDiscounts: "No discounts yet.",
    errRequired: "Enter name, percent, dates, and select at least one car.",
    errSave: "Could not save.",
    loading: "Loading…",
  };
}

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

export function PartnerDiscountsPanel() {
  const { locale } = usePartnerLocale();
  const t = useMemo(() => copyFor(locale), [locale]);

  const [mode, setMode] = useState<Mode>("list");
  const [formKind, setFormKind] = useState<"discount" | "markup">("discount");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<DiscountItem[]>([]);
  const [cars, setCars] = useState<PartnerCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [percent, setPercent] = useState("");
  const [from, setFrom] = useState(() => defaultDates().from);
  const [to, setTo] = useState(() => defaultDates().to);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const carById = useMemo(() => new Map(cars.map((c) => [c.id, c])), [cars]);

  const groupedCars = useMemo(() => {
    const groups = new Map<string, PartnerCar[]>();
    for (const car of cars) {
      const key = car.categorySlug || "other";
      const list = groups.get(key) || [];
      list.push(car);
      groups.set(key, list);
    }
    return [...groups.entries()].sort((a, b) =>
      categoryLabel(a[0], locale).localeCompare(categoryLabel(b[0], locale)),
    );
  }, [cars, locale]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partners/discounts");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "load failed");
      setItems(Array.isArray(data.items) ? data.items : []);
      setCars(Array.isArray(data.cars) ? data.cars : []);
    } catch {
      setError(t.errSave);
    } finally {
      setLoading(false);
    }
  }, [t.errSave]);

  useEffect(() => {
    void load();
  }, [load]);

  const discounts = useMemo(() => items.filter((i) => i.kind === "discount"), [items]);
  const markups = useMemo(() => items.filter((i) => i.kind === "markup"), [items]);

  const openCreate = (kind: "discount" | "markup") => {
    const dates = defaultDates();
    setFormKind(kind);
    setEditingId(null);
    setTitle("");
    setPercent("");
    setFrom(dates.from);
    setTo(dates.to);
    setSelected(new Set());
    setError("");
    setMode("form");
  };

  const openEdit = (item: DiscountItem) => {
    setFormKind(item.kind);
    setEditingId(item.id);
    setTitle(item.title);
    setPercent(String(item.percent));
    setFrom(item.from);
    setTo(item.to);
    setSelected(new Set(item.carIds));
    setError("");
    setMode("form");
  };

  const toggleCar = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids?: string[]) => {
    if (ids) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      return;
    }
    setSelected(new Set(cars.map((c) => c.id)));
  };

  const resetSelection = (ids?: string[]) => {
    if (ids) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      return;
    }
    setSelected(new Set());
  };

  const save = async () => {
    const pct = Number(percent);
    if (!title.trim() || !Number.isFinite(pct) || pct <= 0 || !from || !to || selected.size === 0) {
      setError(t.errRequired);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        id: editingId || undefined,
        title: title.trim(),
        percent: pct,
        kind: formKind,
        from,
        to,
        carIds: [...selected],
      };
      const res = await fetch("/api/partners/discounts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "save failed");
      await load();
      setMode("list");
    } catch {
      setError(t.errSave);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/partners/discounts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      await load();
      setMode("list");
    } catch {
      setError(t.errSave);
    } finally {
      setSaving(false);
    }
  };

  const renderRowCars = (item: DiscountItem) => {
    const names = item.carIds
      .map((id) => carById.get(id))
      .filter(Boolean)
      .map((c) => `${c!.make} ${c!.model}`.trim());
    return `${t.carCount(item.carIds.length)}: ${names.join(", ") || "—"}`;
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

  if (mode === "form") {
    const formTitle = editingId
      ? formKind === "markup"
        ? t.formEditMarkup
        : t.formEditDiscount
      : formKind === "markup"
        ? t.formTitleMarkup
        : t.formTitleDiscount;

    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <div className="bg-[#3d2a6d] px-4 py-5 text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold sm:text-2xl">{formTitle}</h1>
            <button
              type="button"
              onClick={() => setMode("list")}
              className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
            >
              {t.back}
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-4 text-base font-bold text-[#0b1f4b]">{t.params}</h2>
                <div className="space-y-4">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={formKind === "markup" ? t.markupNamePh : t.namePh}
                    className="w-full rounded-md border border-[#c5ced8] px-3 py-2.5 text-sm outline-none focus:border-[#5b4a8a]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t.from}
                      <DateInput
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[#c5ced8] px-3 py-2 text-sm outline-none focus:border-[#5b4a8a]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-600">
                      {t.to}
                      <DateInput
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[#c5ced8] px-3 py-2 text-sm outline-none focus:border-[#5b4a8a]"
                      />
                    </label>
                  </div>
                  <input
                    value={percent}
                    onChange={(e) => setPercent(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder={formKind === "markup" ? t.markupPercentPh : t.percentPh}
                    inputMode="decimal"
                    className="w-full rounded-md border border-[#c5ced8] px-3 py-2.5 text-sm outline-none focus:border-[#5b4a8a]"
                  />
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-[#0b1f4b]">{t.cars}</h2>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#1d6fe8]">
                    <button type="button" onClick={() => selectAll()} className="hover:underline">
                      {t.selectAll}
                    </button>
                    <button type="button" onClick={() => resetSelection()} className="hover:underline">
                      {t.reset}
                    </button>
                  </div>
                </div>
                <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
                  {groupedCars.map(([slug, group]) => {
                    const ids = group.map((c) => c.id);
                    return (
                      <div key={slug} className="rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                          <span className="text-sm font-bold text-[#0b1f4b]">
                            {categoryLabel(slug, locale)}
                          </span>
                          <div className="flex gap-2 text-[11px] font-semibold text-[#1d6fe8]">
                            <button type="button" onClick={() => selectAll(ids)} className="hover:underline">
                              {t.selectAll}
                            </button>
                            <button
                              type="button"
                              onClick={() => resetSelection(ids)}
                              className="hover:underline"
                            >
                              {t.reset}
                            </button>
                          </div>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {group.map((car) => (
                            <li key={car.id}>
                              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  checked={selected.has(car.id)}
                                  onChange={() => toggleCar(car.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-[#3d2a6d]"
                                />
                                <span className="text-[#0b1f4b]">{carLabel(car)}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {cars.length === 0 ? (
                    <p className="text-sm text-slate-500">—</p>
                  ) : null}
                </div>
              </section>
            </div>

            {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-md bg-[#28a745] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#23923d] disabled:opacity-60"
              >
                {saving ? t.saving : t.save}
              </button>
              {editingId ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void remove(editingId)}
                  className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  {t.delete}
                </button>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="bg-[#3d2a6d] px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-extrabold sm:text-xl">
            {t.discounts} &amp; {t.markups}
          </h1>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-[#0b1f4b]">{t.discounts}</h2>
            <button
              type="button"
              onClick={() => openCreate("discount")}
              className="min-h-11 rounded-md bg-[#28a745] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#23923d] md:min-h-0"
            >
              {t.addDiscount}
            </button>
          </div>

          {discounts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">{t.emptyDiscounts}</p>
          ) : (
            <ResponsiveDataList
              className="p-3 md:p-0"
              desktop={
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#e8f5e9] text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">{t.titleCol}</th>
                      <th className="px-4 py-2.5">{t.amountCol}</th>
                      <th className="px-4 py-2.5">{t.periodCol}</th>
                      <th className="px-4 py-2.5">{t.carsCol}</th>
                      <th className="px-4 py-2.5">{t.actionsCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-[#f4f8fc]"}
                      >
                        <td className="px-4 py-3 font-semibold text-[#0b1f4b]">{item.title}</td>
                        <td className="px-4 py-3 text-slate-700">-{item.percent}%</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDay(item.from, locale)} — {formatDay(item.to, locale)}
                        </td>
                        <td className="max-w-md px-4 py-3 text-slate-700">{renderRowCars(item)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="font-semibold text-[#1d6fe8] hover:underline"
                          >
                            {t.editDiscount}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              mobile={
                <>
                  {discounts.map((item) => (
                    <MobileDataCard key={item.id}>
                      <MobileDataRow label={t.titleCol}>{item.title}</MobileDataRow>
                      <MobileDataRow label={t.amountCol}>-{item.percent}%</MobileDataRow>
                      <MobileDataRow label={t.periodCol}>
                        {formatDay(item.from, locale)} — {formatDay(item.to, locale)}
                      </MobileDataRow>
                      <MobileDataRow label={t.carsCol}>{renderRowCars(item)}</MobileDataRow>
                      <MobileDataRow label={t.actionsCol}>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="inline-flex min-h-11 items-center font-semibold text-[#1d6fe8] hover:underline"
                        >
                          {t.editDiscount}
                        </button>
                      </MobileDataRow>
                    </MobileDataCard>
                  ))}
                </>
              }
            />
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-[#0b1f4b]">{t.markups}</h2>
          </div>
          {markups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="mb-4 text-sm text-slate-600">{t.markupEmpty}</p>
              <button
                type="button"
                onClick={() => openCreate("markup")}
                className="rounded-md bg-[#28a745] px-4 py-2 text-sm font-bold text-white hover:bg-[#23923d]"
              >
                {t.addMarkup}
              </button>
            </div>
          ) : (
            <>
              <ResponsiveDataList
                className="p-3 md:p-0"
                desktop={
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#e8f5e9] text-xs font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">{t.titleCol}</th>
                        <th className="px-4 py-2.5">{t.amountCol}</th>
                        <th className="px-4 py-2.5">{t.periodCol}</th>
                        <th className="px-4 py-2.5">{t.carsCol}</th>
                        <th className="px-4 py-2.5">{t.actionsCol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {markups.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={idx % 2 === 0 ? "bg-white" : "bg-[#f4f8fc]"}
                        >
                          <td className="px-4 py-3 font-semibold text-[#0b1f4b]">{item.title}</td>
                          <td className="px-4 py-3 text-slate-700">+{item.percent}%</td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDay(item.from, locale)} — {formatDay(item.to, locale)}
                          </td>
                          <td className="max-w-md px-4 py-3 text-slate-700">{renderRowCars(item)}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="font-semibold text-[#1d6fe8] hover:underline"
                            >
                              {t.editMarkup}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                mobile={
                  <>
                    {markups.map((item) => (
                      <MobileDataCard key={item.id}>
                        <MobileDataRow label={t.titleCol}>{item.title}</MobileDataRow>
                        <MobileDataRow label={t.amountCol}>+{item.percent}%</MobileDataRow>
                        <MobileDataRow label={t.periodCol}>
                          {formatDay(item.from, locale)} — {formatDay(item.to, locale)}
                        </MobileDataRow>
                        <MobileDataRow label={t.carsCol}>{renderRowCars(item)}</MobileDataRow>
                        <MobileDataRow label={t.actionsCol}>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="inline-flex min-h-11 items-center font-semibold text-[#1d6fe8] hover:underline"
                          >
                            {t.editMarkup}
                          </button>
                        </MobileDataRow>
                      </MobileDataCard>
                    ))}
                  </>
                }
              />
              <div className="border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => openCreate("markup")}
                  className="min-h-11 rounded-md bg-[#28a745] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#23923d] md:min-h-0"
                >
                  {t.addMarkup}
                </button>
              </div>
            </>
          )}
        </section>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </main>
    </div>
  );
}
