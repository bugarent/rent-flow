"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

export type DeliveryCountryOption = {
  iso2: string;
  name: string;
  count: number;
};

export function DeliveryCountryFilter({
  countries,
  valueIso2,
  onChange,
  label,
  allLabel,
  searchLabel,
  emptyLabel,
}: {
  countries: DeliveryCountryOption[];
  valueIso2: string;
  onChange: (iso2: string) => void;
  label: string;
  allLabel: string;
  searchLabel: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = countries.find((country) => country.iso2 === valueIso2) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(q) || country.iso2.toLowerCase().includes(q),
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (iso2: string) => {
    onChange(iso2);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative w-full sm:max-w-md">
      <p className="mb-1.5 text-sm font-semibold text-[#3a4553]">{label}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 text-left text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) requestAnimationFrame(() => searchRef.current?.focus());
        }}
      >
        {selected ? (
          <>
            <CountryFlag iso2={selected.iso2} title={selected.name} />
            <span className="min-w-0 flex-1 truncate font-semibold text-[#0b1f4b]">{selected.name}</span>
            <span className="shrink-0 text-xs font-bold text-slate-400">{selected.count}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate font-semibold text-[#0b1f4b]">{allLabel}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 flex max-h-80 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchLabel}
              aria-label={searchLabel}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base outline-none placeholder:text-slate-400 focus:border-sky-400"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1" role="listbox">
            <button
              type="button"
              className={cn(
                "flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left text-sm",
                !valueIso2 ? "bg-sky-50 font-semibold text-sky-950" : "text-slate-800 hover:bg-slate-50",
              )}
              onClick={() => pick("")}
            >
              {allLabel}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">{emptyLabel}</p>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.iso2}
                  type="button"
                  role="option"
                  aria-selected={country.iso2 === valueIso2}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                    country.iso2 === valueIso2
                      ? "bg-sky-50 font-semibold text-sky-950"
                      : "text-slate-800 hover:bg-slate-50",
                  )}
                  onClick={() => pick(country.iso2)}
                >
                  <CountryFlag iso2={country.iso2} title={country.name} />
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 text-xs font-bold text-slate-400">{country.count}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
