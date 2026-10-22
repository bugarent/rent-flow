"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { earliestPickupIsoDate } from "@/lib/bookings/lead-time";
import { SearchDateRangePicker, type DateRangeField } from "@/components/search/search-date-range-picker";

function formatDdMmYyyy(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

function closeLabel(locale: string) {
  if (locale === "ka") return "დახურვა";
  if (locale === "ru") return "Закрыть";
  return "Close";
}

/** Pick-up and return dates; either button opens one range calendar for both. */
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
  const [open, setOpen] = useState<DateRangeField | null>(null);

  const dateButton = (field: DateRangeField, iso: string) => {
    const pickup = field === "pickup";
    return (
      <button
        type="button"
        onClick={() => setOpen(field)}
        className={cn(
          "inline-flex min-h-12 w-full min-w-0 items-center gap-2.5 rounded-xl border-2 bg-white px-3 py-3 text-left text-sm font-extrabold tabular-nums text-[#0b1f4b] shadow-sm transition",
          open === field
            ? pickup
              ? "border-[#28a745] ring-2 ring-[#28a745]/25"
              : "border-[#1d6fe8] ring-2 ring-[#1d6fe8]/25"
            : pickup
              ? "border-slate-200 hover:border-emerald-300"
              : "border-slate-200 hover:border-sky-300",
        )}
      >
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            pickup ? "bg-emerald-50 text-[#28a745]" : "bg-sky-50 text-[#1d6fe8]",
          )}
        >
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="block min-w-0 truncate text-base">{formatDdMmYyyy(iso)}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="space-y-1">
          {pickupLabel ? (
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">{pickupLabel}</p>
          ) : null}
          {dateButton("pickup", pickupDate)}
        </div>
        <span className="hidden pb-3 text-center text-lg font-black text-slate-300 sm:block" aria-hidden>
          →
        </span>
        <div className="space-y-1">
          {dropoffLabel ? (
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-sky-800">{dropoffLabel}</p>
          ) : null}
          {dateButton("dropoff", dropoffDate)}
        </div>
      </div>

      {open ? (
        <SearchDateRangePicker
          initialField={open}
          pickupDate={pickupDate}
          dropoffDate={dropoffDate}
          minDate={earliestPickupIsoDate()}
          locale={locale}
          pickupLabel={pickupLabel || "Pick-up"}
          dropoffLabel={dropoffLabel || "Return"}
          closeLabel={closeLabel(locale)}
          onClose={() => setOpen(null)}
          onApply={(range) => {
            onChange(range);
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}

export const BOOKING_TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
