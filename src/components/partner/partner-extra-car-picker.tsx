"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type PartnerExtraCarOption = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  categorySlug: string | null;
  registrationNumber: string | null;
};

function categoryLabel(slug: string | null | undefined, locale: string) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key) {
    return locale === "ka" ? "სხვა" : locale === "ru" ? "Другое" : "Other";
  }
  return key;
}

function carLabel(car: PartnerExtraCarOption) {
  const name = car.title?.trim() || `${car.make} ${car.model}`.trim() || car.id;
  const plate = String(car.registrationNumber || "").trim();
  return plate ? `${name} · ${plate}` : name;
}

export function PartnerExtraCarPicker({
  cars,
  selectedIds,
  onChange,
  locale,
  disabled,
}: {
  cars: PartnerExtraCarOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  locale: string;
  disabled?: boolean;
}) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const groups = useMemo(() => {
    const map = new Map<string, PartnerExtraCarOption[]>();
    for (const car of cars) {
      const key = categoryLabel(car.categorySlug, locale);
      const list = map.get(key) || [];
      list.push(car);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [cars, locale]);

  const setGroup = (groupCars: PartnerExtraCarOption[], on: boolean) => {
    const next = new Set(selected);
    for (const car of groupCars) {
      if (on) next.add(car.id);
      else next.delete(car.id);
    }
    onChange([...next]);
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  if (!cars.length) {
    return (
      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
        {locale === "ka"
          ? "ჯერ ატვირთეთ მანქანის განცხადება — აქ გამოჩნდება სია."
          : locale === "ru"
            ? "Сначала загрузите объявления авто — здесь появится список."
            : "Upload car listings first — they will appear here."}
      </p>
    );
  }

  const copy = {
    cars: locale === "ka" ? "მანქანები" : locale === "ru" ? "Автомобили" : "Cars",
    selectAll: locale === "ka" ? "ყველას მონიშვნა" : locale === "ru" ? "Выбрать все" : "Select all",
    reset: locale === "ka" ? "გაუქმება" : locale === "ru" ? "Сбросить" : "Reset",
    selected: locale === "ka" ? "არჩეული" : locale === "ru" ? "выбрано" : "selected",
    hint:
      locale === "ka"
        ? "მონიშნეთ მანქანები, რომლებზეც ეს მომსახურება გააქტიურდება."
        : locale === "ru"
          ? "Отметьте авто, для которых включить эту услугу."
          : "Select cars this service should apply to.",
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-sky-200 bg-[#f7fbff] px-3 py-2.5",
        disabled && "pointer-events-none opacity-55",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#0b1f4b]">{copy.cars}</p>
          <p className="text-[10px] text-slate-500">{copy.hint}</p>
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          {selected.size} / {cars.length} {copy.selected}
        </p>
      </div>

      <div className="max-h-[calc(14rem+10cm)] space-y-2.5 overflow-y-auto overscroll-contain pr-0.5">
        {groups.map(([group, groupCars]) => {
          return (
            <section key={group}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold capitalize text-slate-700">{group}</h3>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  <button
                    type="button"
                    className="text-[#1d6fe8] hover:underline"
                    onClick={() => setGroup(groupCars, true)}
                  >
                    {copy.selectAll}
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 hover:underline"
                    onClick={() => setGroup(groupCars, false)}
                  >
                    {copy.reset}
                  </button>
                </div>
              </div>
              <ul className="space-y-1">
                {groupCars.map((car) => {
                  const checked = selected.has(car.id);
                  return (
                    <li key={car.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/80">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(car.id)}
                          className="h-3.5 w-3.5 accent-[#28a745]"
                        />
                        <span className="min-w-0 truncate text-xs font-semibold text-slate-800">
                          {carLabel(car)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
