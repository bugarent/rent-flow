"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBusinessPartnerPreferences } from "@/components/providers/business-partner-preferences-context";
import { uiLocaleTag } from "@/lib/i18n/ui-text";
import { businessToolLine } from "@/lib/i18n/business-tool-copy";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToParts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function formatDmy(iso: string) {
  const p = isoToParts(iso);
  if (!p) return "";
  return `${pad2(p.d)}/${pad2(p.m)}/${p.y}`;
}

function weekdayLabels(locale: string) {
  const tag = uiLocaleTag(locale);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return d.toLocaleDateString(tag, { weekday: "short", timeZone: "UTC" });
  });
}

function monthLabel(y: number, m: number, locale: string) {
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(uiLocaleTag(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CabinetDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const { locale } = useBusinessPartnerPreferences();
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = useMemo(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }, []);
  const selected = isoToParts(value);
  const [viewY, setViewY] = useState(selected?.y ?? today.y);
  const [viewM, setViewM] = useState(selected?.m ?? today.m);

  useEffect(() => {
    if (!open) return;
    const p = isoToParts(value);
    setViewY(p?.y ?? today.y);
    setViewM(p?.m ?? today.m);
  }, [open, value, today.y, today.m]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(Date.UTC(viewY, viewM - 1, 1));
    // Monday-first: UTC Sunday=0 → shift so Mon=0
    const startPad = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewY, viewM, 0)).getUTCDate();
    const cells: Array<{ y: number; m: number; d: number; inMonth: boolean } | null> = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ y: viewY, m: viewM, d, inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewY, viewM]);

  const shiftMonth = (delta: number) => {
    const dt = new Date(Date.UTC(viewY, viewM - 1 + delta, 1));
    setViewY(dt.getUTCFullYear());
    setViewM(dt.getUTCMonth() + 1);
  };

  return (
    <div ref={rootRef} className="relative">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex w-full min-w-[11rem] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-normal text-slate-800 hover:border-slate-300"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value ? formatDmy(value) : businessToolLine(locale, "datePlaceholder")}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[#1d6fe8]">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[17.5rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-sm font-extrabold capitalize text-[#0b1f4b]">{monthLabel(viewY, viewM, locale)}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdays.map((w) => (
              <div key={w} className="py-1 text-center text-[10px] font-semibold uppercase text-slate-400">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} className="h-8" />;
              const iso = toIso(cell.y, cell.m, cell.d);
              const isSelected = value === iso;
              const isToday =
                cell.y === today.y && cell.m === today.m && cell.d === today.d;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={[
                    "h-8 rounded-lg text-sm font-semibold transition",
                    isSelected
                      ? "bg-[#0b1f4b] text-white"
                      : isToday
                        ? "bg-sky-50 text-[#0b1f4b] hover:bg-sky-100"
                        : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {cell.d}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
