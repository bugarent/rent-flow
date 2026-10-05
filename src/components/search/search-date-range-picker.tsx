"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateRangeField = "pickup" | "dropoff";

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function formatRangeDay(iso: string, locale: string) {
  const d = parseIso(iso);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat(locale || "en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

function monthTitle(d: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale || "en", { month: "long", year: "numeric" }).format(d);
  } catch {
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

function weekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i);
    try {
      return new Intl.DateTimeFormat(locale || "en", { weekday: "short" }).format(d);
    } catch {
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] || "";
    }
  });
}

const HINTS: Record<string, { start: string; end: string }> = {
  en: { start: "Tap your pick-up date", end: "Now tap your drop-off date" },
  ka: { start: "აირჩიეთ აღების თარიღი", end: "ახლა აირჩიეთ დაბრუნების თარიღი" },
  ru: { start: "Выберите дату получения", end: "Теперь выберите дату возврата" },
};

export function SearchDateRangePicker({
  initialField,
  pickupDate,
  dropoffDate,
  minDate,
  locale,
  pickupLabel,
  dropoffLabel,
  closeLabel,
  onApply,
  onClose,
}: {
  initialField: DateRangeField;
  pickupDate: string;
  dropoffDate: string;
  minDate: string;
  locale: string;
  pickupLabel: string;
  dropoffLabel: string;
  closeLabel: string;
  onApply: (range: { pickupDate: string; dropoffDate: string }) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"start" | "end">(initialField === "pickup" ? "start" : "end");
  const [start, setStart] = useState(pickupDate);
  const [end, setEnd] = useState<string | null>(dropoffDate || null);
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() =>
    monthStart(
      parseIso(initialField === "pickup" ? pickupDate : dropoffDate) ||
        parseIso(minDate) ||
        new Date(),
    ),
  );
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const hints = HINTS[locale] || HINTS.en;
  const minMonth = monthStart(parseIso(minDate) || new Date());
  const canGoPrev = viewMonth > minMonth;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cells = useMemo(() => {
    const first = monthStart(viewMonth);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out: Array<Date | null> = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(new Date(first.getFullYear(), first.getMonth(), day));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  const rangeEnd = phase === "end" && hoverIso && hoverIso >= start ? hoverIso : end;
  const todayIso = toIso(new Date());

  function pick(iso: string) {
    if (iso < minDate) return;
    if (phase === "start" || iso < start) {
      setStart(iso);
      setEnd(null);
      setPhase("end");
      return;
    }
    onApply({ pickupDate: start, dropoffDate: iso });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/50 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white text-slate-800 shadow-2xl">
        <div className="flex items-start gap-2 border-b border-slate-100 p-3">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            {(
              [
                { key: "start", label: pickupLabel, iso: start },
                { key: "end", label: dropoffLabel, iso: end || "" },
              ] as const
            ).map((tile) => (
              <button
                key={tile.key}
                type="button"
                onClick={() => setPhase(tile.key)}
                className={cn(
                  "min-w-0 rounded-xl border-2 px-3 py-2 text-left transition",
                  phase === tile.key ? "border-[#1d6fe8] bg-sky-50" : "border-slate-200",
                )}
              >
                <span className="block truncate text-[11px] font-semibold text-slate-500">{tile.label}</span>
                <span className="block truncate text-sm font-extrabold text-[#0b1f4b]">
                  {tile.iso ? formatRangeDay(tile.iso, locale) : "—"}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          <p className="mb-2 text-center text-sm font-bold text-[#1d6fe8]">
            {phase === "start" ? hints.start : hints.end}
          </p>

          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-base font-extrabold capitalize text-[#0b1f4b]">{monthTitle(viewMonth, locale)}</p>
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400">
            {weekdays.map((w, i) => (
              <div key={`${w}-${i}`} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHoverIso(null)}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="h-10" />;
              const iso = toIso(day);
              const disabled = iso < minDate;
              const isStart = iso === start;
              const isEnd = Boolean(rangeEnd) && iso === rangeEnd;
              const inRange = Boolean(rangeEnd) && iso > start && iso < rangeEnd!;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(iso)}
                  onMouseEnter={() => setHoverIso(iso)}
                  className={cn(
                    "h-10 min-h-0 min-w-0 text-sm font-bold tabular-nums transition",
                    disabled && "cursor-not-allowed text-slate-300",
                    !disabled && inRange && "bg-sky-100 text-sky-900",
                    !disabled && (isStart || isEnd) && "rounded-lg bg-[#1d6fe8] text-white shadow-sm",
                    !disabled && !inRange && !isStart && !isEnd && "rounded-lg text-slate-700 hover:bg-slate-100",
                    iso === todayIso && !isStart && !isEnd && "underline decoration-2 underline-offset-4",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
