"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { earliestPickupIsoDate, localIsoDate } from "@/lib/bookings/lead-time";

function parseIsoDay(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDdMmYyyy(iso: string) {
  const d = parseIsoDay(iso);
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function monthTitle(d: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

function weekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i);
    try {
      return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
        weekday: "short",
      }).format(d);
    } catch {
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] || "";
    }
  });
}

type Which = "pickup" | "dropoff";

function MiniCalendar({
  pickupDate,
  dropoffDate,
  locale,
  active,
  onPick,
}: {
  pickupDate: string;
  dropoffDate: string;
  locale: string;
  active: Which;
  onPick: (iso: string) => void;
}) {
  const pickup = parseIsoDay(pickupDate);
  const dropoff = parseIsoDay(dropoffDate);
  const seedIso = active === "dropoff" ? dropoffDate || pickupDate : pickupDate || dropoffDate;
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseIsoDay(seedIso) || new Date()),
  );
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  useEffect(() => {
    setViewMonth(startOfMonth(parseIsoDay(seedIso) || new Date()));
  }, [active, seedIso]);

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out: Array<Date | null> = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(new Date(first.getFullYear(), first.getMonth(), day));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  const hint =
    locale === "ka"
      ? active === "pickup"
        ? "აირჩიეთ აღების თარიღი"
        : "აირჩიეთ დაბრუნების თარიღი"
      : locale === "ru"
        ? active === "pickup"
          ? "Выберите дату получения"
          : "Выберите дату возврата"
        : active === "pickup"
          ? "Choose pick-up date"
          : "Choose return date";

  return (
    <div className="w-[min(100vw-2.5rem,280px)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-center text-[11px] font-bold text-[#1d6fe8]">{hint}</p>
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-extrabold capitalize text-[#0b1f4b]">
          {monthTitle(viewMonth, locale)}
        </p>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-slate-400">
        {weekdays.map((w, i) => (
          <div key={`${w}-${i}`} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-9" />;
          const iso = toIsoDay(day);
          const todayIso = localIsoDate(new Date());
          const minIso = active === "dropoff" ? pickupDate || earliestPickupIsoDate() : earliestPickupIsoDate();
          const isPast = iso < minIso;
          const isToday = iso === todayIso;
          const isStart = pickup ? sameDay(day, pickup) : false;
          const isEnd = dropoff ? sameDay(day, dropoff) : false;
          const inRange =
            Boolean(pickup && dropoff) &&
            iso > toIsoDay(pickup!) &&
            iso < toIsoDay(dropoff!);
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => {
                if (isPast) return;
                onPick(iso);
              }}
              className={cn(
                "h-9 rounded-lg text-sm font-bold tabular-nums transition",
                isPast && "cursor-not-allowed text-slate-300",
                !isPast && inRange && "bg-emerald-100 text-emerald-900",
                !isPast && (isStart || isEnd) && "bg-[#28a745] text-white shadow-sm",
                !isPast && !isStart && !isEnd && !inRange && "text-slate-700 hover:bg-slate-100",
                isToday && !isStart && !isEnd && "ring-2 ring-inset ring-sky-500",
              )}
              aria-current={isToday ? "date" : undefined}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingPeriodDateRange({
  pickupDate,
  dropoffDate,
  locale,
  pickupLabel,
  dropoffLabel,
  onChange,
}: {
  pickupDate: string;
  dropoffDate: string;
  locale: string;
  pickupLabel?: string;
  dropoffLabel?: string;
  onChange: (next: { pickupDate: string; dropoffDate: string }) => void;
}) {
  const [open, setOpen] = useState<Which | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(iso: string) {
    const minPickup = earliestPickupIsoDate();
    if (open === "pickup") {
      if (iso < minPickup) return;
      const nextDrop = dropoffDate && dropoffDate < iso ? iso : dropoffDate || iso;
      onChange({ pickupDate: iso, dropoffDate: nextDrop });
      setOpen("dropoff");
      return;
    }
    if (open === "dropoff") {
      if (iso < pickupDate) {
        if (iso < minPickup) return;
        onChange({ pickupDate: iso, dropoffDate: pickupDate });
      } else {
        onChange({ pickupDate, dropoffDate: iso });
      }
      setOpen(null);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="space-y-1">
          {pickupLabel ? (
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
              {pickupLabel}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "pickup" ? null : "pickup"))}
            className={cn(
              "inline-flex w-full min-w-0 items-center gap-2.5 rounded-xl border-2 bg-white px-3 py-3 text-left text-sm font-extrabold tabular-nums text-[#0b1f4b] shadow-sm transition",
              open === "pickup"
                ? "border-[#28a745] ring-2 ring-[#28a745]/25"
                : "border-slate-200 hover:border-emerald-300",
            )}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#28a745]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base">{formatDdMmYyyy(pickupDate)}</span>
            </span>
          </button>
        </div>

        <span
          className="hidden pb-3 text-center text-lg font-black text-slate-300 sm:block"
          aria-hidden
        >
          →
        </span>

        <div className="space-y-1">
          {dropoffLabel ? (
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-sky-800">
              {dropoffLabel}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "dropoff" ? null : "dropoff"))}
            className={cn(
              "inline-flex w-full min-w-0 items-center gap-2.5 rounded-xl border-2 bg-white px-3 py-3 text-left text-sm font-extrabold tabular-nums text-[#0b1f4b] shadow-sm transition",
              open === "dropoff"
                ? "border-[#1d6fe8] ring-2 ring-[#1d6fe8]/25"
                : "border-slate-200 hover:border-sky-300",
            )}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#1d6fe8]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base">{formatDdMmYyyy(dropoffDate)}</span>
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2">
          <MiniCalendar
            pickupDate={pickupDate}
            dropoffDate={dropoffDate}
            locale={locale}
            active={open}
            onPick={pick}
          />
        </div>
      ) : null}
    </div>
  );
}

export const BOOKING_TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
