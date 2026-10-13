"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryLocationOption } from "@/components/partner/personal-info-locations";

type Copy = {
  selectLocation: string;
  noLocations: string;
  selectAllLocations: string;
  locationsPicked: string;
  locationsDone: string;
  locationAwaitingApproval: string;
};

export function PartnerLocationMultiPicker({
  locations,
  isSelected,
  onToggle,
  invalid,
  copy,
}: {
  locations: CountryLocationOption[];
  isSelected: (loc: CountryLocationOption) => boolean;
  onToggle: (loc: CountryLocationOption) => void;
  invalid?: boolean;
  copy: Copy;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = locations.filter((loc) => loc.isActive);
  const pickedCount = active.filter(isSelected).length;
  const allPicked = active.length > 0 && pickedCount === active.length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleAll = () => {
    for (const loc of active) {
      if (allPicked || !isSelected(loc)) onToggle(loc);
    }
  };

  const triggerLabel =
    active.length === 0
      ? copy.noLocations
      : pickedCount > 0
        ? `${copy.selectLocation} · ${copy.locationsPicked.replace("{n}", String(pickedCount))}`
        : copy.selectLocation;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={active.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-[#c5ced8] bg-white px-3 py-2 text-start text-base text-[#1f2937] outline-none focus:border-[#5b4a8a] focus:ring-2 focus:ring-[#5b4a8a]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs",
          invalid && "border-red-500 bg-red-50",
        )}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-[#c5ced8] bg-white shadow-lg"
        >
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 sm:text-xs">
            <input
              type="checkbox"
              checked={allPicked}
              onChange={toggleAll}
              className="h-4 w-4 shrink-0 accent-[#0b5c2e]"
            />
            {copy.selectAllLocations}
          </label>
          <ul className="max-h-64 overflow-y-auto py-1">
            {active.map((loc) => {
              const checked = isSelected(loc);
              return (
                <li key={loc.id}>
                  <label
                    className={cn(
                      "flex min-h-10 cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-slate-50 sm:text-xs",
                      checked && "bg-emerald-50/70",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(loc)}
                      className="h-4 w-4 shrink-0 accent-[#0b5c2e]"
                    />
                    <span className="min-w-0 break-words font-semibold text-slate-800">
                      {loc.label}
                      {!loc.approved ? (
                        <span className="ms-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                          {copy.locationAwaitingApproval}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">
              {copy.locationsPicked.replace("{n}", String(pickedCount))}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-9 items-center gap-1 rounded-md bg-[#0b5c2e] px-3 text-xs font-bold text-white"
            >
              <Check className="h-3.5 w-3.5" /> {copy.locationsDone}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
