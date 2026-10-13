"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, Search, X } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

export type DeliveryCountryOption = { iso2: string; title: string };

/** Country search box that drops down a flag list; typing filters, a click picks one country. */
export function DeliveryCountryPicker({
  options,
  query,
  selectedIso2,
  onQueryChange,
  onSelect,
  labels,
}: {
  /** Countries to list, already filtered by the typed text. */
  options: DeliveryCountryOption[];
  query: string;
  /** Picked country, or "" for all countries. */
  selectedIso2: string;
  onQueryChange: (query: string) => void;
  onSelect: (iso2: string) => void;
  labels: { search: string; placeholder: string; all: string; empty: string; clear: string; toggle: string };
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.iso2 === selectedIso2);
  const inputValue = selectedIso2 ? (selected?.title ?? query) : query;
  const items: DeliveryCountryOption[] = [{ iso2: "", title: labels.all }, ...options];
  const active = Math.min(highlight, items.length - 1);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (iso2: string) => {
    onSelect(iso2);
    setOpen(false);
    setHighlight(0);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((active + step + items.length) % items.length);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const item = items[active];
      if (item) pick(item.iso2);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="relative block">
        <span className="sr-only">{labels.search}</span>
        {selected ? (
          <CountryFlag
            iso2={selected.iso2}
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-6 -translate-y-1/2 rounded-sm shadow-sm"
          />
        ) : (
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          className={cn(
            "min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2 pr-20 text-base font-semibold text-[#0b1f4b] outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
            selected ? "pl-12" : "pl-11",
          )}
        />
      </label>
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {inputValue ? (
          <button
            type="button"
            aria-label={labels.clear}
            onClick={() => {
              pick("");
              inputRef.current?.focus();
            }}
            className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={labels.toggle}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[min(60dvh,22rem)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {items.map((item, index) => {
            const isSelected = item.iso2 ? item.iso2 === selectedIso2 : !selectedIso2 && !query.trim();
            return (
              <li
                key={item.iso2 || "all"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(item.iso2)}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-[#0b1f4b] sm:text-base",
                  index === active && "bg-sky-50",
                  isSelected && "text-sky-800",
                )}
              >
                {item.iso2 ? (
                  <CountryFlag iso2={item.iso2} className="h-4 w-6 shrink-0 rounded-sm shadow-sm" />
                ) : (
                  <Globe2 className="h-5 w-6 shrink-0 text-slate-400" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-sky-700" aria-hidden /> : null}
              </li>
            );
          })}
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm font-medium text-slate-500">{labels.empty}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
