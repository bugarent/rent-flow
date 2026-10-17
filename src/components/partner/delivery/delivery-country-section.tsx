"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { cn } from "@/lib/utils";
import type { DeliveryCopy } from "./delivery-copy";
import { DeliveryRowsTable } from "./delivery-rows-table";
import { optionMatchesRow, type DeliveryAddOption, type DeliveryRowState } from "./delivery-types";

type TableHandlers = Omit<Parameters<typeof DeliveryRowsTable>[0], "rows" | "locale" | "t">;

/** One operating country: flag header with "+" to add airports/cities, then its active places. */
export function DeliveryCountrySection({
  iso2,
  rows,
  options,
  open,
  adding,
  locale,
  t,
  onOpenChange,
  onAdd,
  ...table
}: {
  iso2: string;
  rows: DeliveryRowState[];
  options: DeliveryAddOption[];
  open: boolean;
  adding: boolean;
  locale: string;
  t: DeliveryCopy;
  onOpenChange: (open: boolean) => void;
  onAdd: (ids: string[]) => Promise<boolean>;
} & TableHandlers) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const available = options.filter((opt) => !rows.some((row) => optionMatchesRow(opt, row)));
  const airports = available.filter((opt) => opt.kind === "airport");
  const cities = available.filter((opt) => opt.kind === "city");

  const openPicker = () => {
    onOpenChange(true);
    setPickerOpen((v) => !v);
    setPicked([]);
  };

  const togglePick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const confirmAdd = async () => {
    if (!picked.length) return;
    if (await onAdd(picked)) {
      setPicked([]);
      setPickerOpen(false);
    }
  };

  const optionList = (title: string, list: DeliveryAddOption[]) =>
    list.length ? (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {list.map((opt) => {
            const on = picked.includes(opt.id);
            return (
              <li key={opt.id}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm",
                    on ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-800",
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[#28a745]"
                    checked={on}
                    onChange={() => togglePick(opt.id)}
                  />
                  <span className="min-w-0 break-words font-semibold">{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <CountryFlag iso2={iso2} className="h-[18px] w-6" />
          <span className="truncate text-base font-extrabold text-[#0b1f4b]">{worldCountryName(iso2)}</span>
          <span className="shrink-0 text-xs font-medium text-slate-400">({iso2})</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {t.placesCount.replace("{n}", String(rows.length))}
          </span>
          <ChevronDown
            className={cn("ml-auto h-5 w-5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={openPicker}
          aria-label={`${t.addPlaces} — ${worldCountryName(iso2)}`}
          title={t.addPlaces}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
            pickerOpen ? "bg-[#1e7e34]" : "bg-[#28a745] hover:bg-[#23923d]",
          )}
        >
          <Plus className={cn("h-5 w-5 transition-transform", pickerOpen && "rotate-45")} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100">
          {pickerOpen ? (
            <div className="space-y-3 border-b border-slate-100 bg-[#f6faf7] px-3 py-3 sm:px-4">
              <p className="text-sm font-bold text-[#0b1f4b]">{t.pickerTitle}</p>
              {available.length ? (
                <>
                  {optionList(t.airports, airports)}
                  {optionList(t.cities, cities)}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!picked.length || adding}
                      onClick={() => void confirmAdd()}
                      className="min-h-11 rounded-md bg-[#28a745] px-4 py-2 text-sm font-bold text-white hover:bg-[#23923d] disabled:opacity-50"
                    >
                      {adding ? t.adding : t.addSelected.replace("{n}", String(picked.length))}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPickerOpen(false);
                        setPicked([]);
                      }}
                      className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">{options.length ? t.allAdded : t.noOptions}</p>
              )}
            </div>
          ) : null}

          {rows.length ? (
            <>
              <DeliveryRowsTable rows={rows} locale={locale} t={t} {...table} />
              <p className="px-3 pb-3 pt-1 text-xs text-slate-500 sm:px-4">{t.offHint}</p>
            </>
          ) : pickerOpen ? null : (
            <p className="px-4 py-5 text-sm text-slate-500">{t.noneAdded}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
