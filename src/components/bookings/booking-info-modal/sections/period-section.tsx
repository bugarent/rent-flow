import { Calendar, Clock3, MapPin } from "lucide-react";
import { clampPickupSelection, isPickupSlotAllowed } from "@/lib/bookings/lead-time";
import {
  BOOKING_TIME_OPTIONS,
  BookingPeriodDateRange,
} from "@/components/bookings/booking-period-date-range";
import { cn } from "@/lib/utils";
import { formatSignedDays, formatSignedMoney, formatWhen } from "../helpers";
import type {
  BookingInfoData,
  BookingInfoLocationOption,
  Copy,
  ExtrasPaymentBreakdown,
} from "../types";

export function PeriodSection({
  t,
  locale,
  booking,
  periodDays,
  liveTotal,
  pickupPlace,
  dropoffPlace,
  editingDates,
  setEditingDates,
  canEditAll,
  canEditGuestFields,
  readOnly,
  pickupDate,
  dropoffDate,
  pickupTime,
  dropoffTime,
  pickupIata,
  dropoffIata,
  setPickupDate,
  setDropoffDate,
  setPickupTime,
  setDropoffTime,
  setPickupIata,
  setDropoffIata,
  locationOptions,
  extrasPaymentBreakdown,
  calendarView = false,
  compact = false,
}: {
  t: Copy;
  locale: string;
  booking: BookingInfoData;
  periodDays: number;
  liveTotal: number;
  pickupPlace: string;
  dropoffPlace: string;
  editingDates: boolean;
  setEditingDates: (value: boolean) => void;
  canEditAll: boolean;
  canEditGuestFields: boolean;
  readOnly: boolean;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  pickupIata: string;
  dropoffIata: string;
  setPickupDate: (value: string) => void;
  setDropoffDate: (value: string) => void;
  setPickupTime: (value: string) => void;
  setDropoffTime: (value: string) => void;
  setPickupIata: (value: string) => void;
  setDropoffIata: (value: string) => void;
  locationOptions: BookingInfoLocationOption[];
  extrasPaymentBreakdown: ExtrasPaymentBreakdown;
  calendarView?: boolean;
  /** Customer booking-lookup dialog — shorter cards. */
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-white shadow-sm",
        calendarView
          ? "border-2 border-slate-300 p-2"
          : compact
            ? "border border-slate-200 p-2.5"
            : "border border-slate-200 p-4",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between",
          calendarView ? "mb-1.5 gap-1.5" : compact ? "mb-2 gap-1.5" : "mb-3 gap-2",
        )}
      >
        <h3
          className={cn(
            "flex items-center font-extrabold text-[#0b1f4b]",
            calendarView || compact ? "gap-1.5 text-xs" : "gap-2 text-sm",
          )}
        >
          <Calendar
            className={cn(
              calendarView || compact ? "h-3.5 w-3.5" : "h-4 w-4",
              "text-[#1d6fe8]",
            )}
          />
          {t.period}
        </h3>
        <div className={cn("flex flex-wrap items-center", calendarView ? "gap-1.5" : "gap-2")}>
          <span
            className={cn(
              "rounded-full bg-sky-50 font-extrabold text-sky-800 ring-1 ring-sky-200",
              calendarView ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            )}
          >
            {t.daysCount.replace("{n}", String(periodDays))}
          </span>
          {editingDates && (canEditAll || canEditGuestFields) && !readOnly ? (
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => setEditingDates(false)}
            >
              {t.cancel}
            </button>
          ) : null}
        </div>
      </div>
      {editingDates && (canEditAll || canEditGuestFields) ? (
        <div className="space-y-3">
          <BookingPeriodDateRange
            pickupDate={pickupDate}
            dropoffDate={dropoffDate}
            locale={locale}
            pickupLabel={t.pickup}
            dropoffLabel={t.dropoff}
            onChange={({ pickupDate: nextPickup, dropoffDate: nextDropoff }) => {
              const slot = clampPickupSelection(nextPickup, pickupTime, BOOKING_TIME_OPTIONS);
              setPickupDate(slot.date);
              setPickupTime(slot.time);
              setDropoffDate(nextDropoff < slot.date ? slot.date : nextDropoff);
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                <MapPin className="h-3.5 w-3.5" />
                {t.pickup}
              </p>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800/80">
                  <Clock3 className="h-3 w-3" />
                  {t.time}
                </span>
                <select
                  className="w-full rounded-xl border-2 border-emerald-200 bg-white px-3 py-2.5 text-sm font-bold text-[#0b1f4b] outline-none focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/20"
                  value={pickupTime}
                  onChange={(e) => {
                    if (!isPickupSlotAllowed(pickupDate, e.target.value)) return;
                    setPickupTime(e.target.value);
                  }}
                  aria-label={`${t.pickup} ${t.time}`}
                >
                  {BOOKING_TIME_OPTIONS.map((tm) => (
                    <option key={tm} value={tm} disabled={!isPickupSlotAllowed(pickupDate, tm)}>
                      {tm}
                    </option>
                  ))}
                </select>
              </label>
              {locationOptions.length > 0 ? (
                <label className="block space-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800/80">
                    <MapPin className="h-3 w-3" />
                    {t.location}
                  </span>
                  <select
                    className="w-full rounded-xl border-2 border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/20"
                    value={pickupIata}
                    onChange={(e) => setPickupIata(e.target.value)}
                    aria-label={`${t.pickup} ${t.location}`}
                  >
                    {locationOptions.map((loc) => (
                      <option key={`pu-${loc.iata}`} value={loc.iata}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="space-y-2.5 rounded-xl border-2 border-sky-100 bg-sky-50/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-sky-900">
                <MapPin className="h-3.5 w-3.5" />
                {t.dropoff}
              </p>
              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800/80">
                  <Clock3 className="h-3 w-3" />
                  {t.time}
                </span>
                <select
                  className="w-full rounded-xl border-2 border-sky-200 bg-white px-3 py-2.5 text-sm font-bold text-[#0b1f4b] outline-none focus:border-[#1d6fe8] focus:ring-2 focus:ring-[#1d6fe8]/20"
                  value={dropoffTime}
                  onChange={(e) => setDropoffTime(e.target.value)}
                  aria-label={`${t.dropoff} ${t.time}`}
                >
                  {BOOKING_TIME_OPTIONS.map((tm) => (
                    <option
                      key={tm}
                      value={tm}
                      disabled={dropoffDate === pickupDate && tm <= pickupTime}
                    >
                      {tm}
                    </option>
                  ))}
                </select>
              </label>
              {locationOptions.length > 0 ? (
                <label className="block space-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800/80">
                    <MapPin className="h-3 w-3" />
                    {t.location}
                  </span>
                  <select
                    className="w-full rounded-xl border-2 border-sky-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-[#1d6fe8] focus:ring-2 focus:ring-[#1d6fe8]/20"
                    value={dropoffIata}
                    onChange={(e) => setDropoffIata(e.target.value)}
                    aria-label={`${t.dropoff} ${t.location}`}
                  >
                    {locationOptions.map((loc) => (
                      <option key={`do-${loc.iata}`} value={loc.iata}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>
          {extrasPaymentBreakdown.tripChanged ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#0b1f4b]">
                  {t.daysPriceChange}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums",
                    (extrasPaymentBreakdown.totalDelta || 0) > 0
                      ? "bg-amber-100 text-amber-900"
                      : (extrasPaymentBreakdown.totalDelta || 0) < 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600",
                  )}
                >
                  {formatSignedMoney(extrasPaymentBreakdown.totalDelta || 0)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 px-3 text-sm">
                {extrasPaymentBreakdown.daysChanged ? (
                  <>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="font-semibold text-slate-500">
                        {locale === "ka"
                          ? "დღეები"
                          : locale === "ru"
                            ? "Дни"
                            : "Days"}
                      </span>
                      <span className="font-extrabold tabular-nums text-[#0b1f4b]">
                        {extrasPaymentBreakdown.originalDays}
                        <span className="mx-1.5 text-slate-300">→</span>
                        {extrasPaymentBreakdown.newDays}
                        <span className="ml-1.5 text-xs font-bold text-slate-500">
                          ({formatSignedDays(extrasPaymentBreakdown.dayDelta)})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="font-semibold text-slate-500">
                        {locale === "ka"
                          ? "ქირა"
                          : locale === "ru"
                            ? "Аренда"
                            : "Rental"}
                      </span>
                      <span className="text-right font-extrabold tabular-nums text-[#0b1f4b]">
                        €{extrasPaymentBreakdown.originalRental.toFixed(2)}
                        <span className="mx-1.5 text-slate-300">→</span>
                        €{extrasPaymentBreakdown.projectedRental.toFixed(2)}
                        <span
                          className={cn(
                            "ml-1.5 text-xs font-bold",
                            extrasPaymentBreakdown.rentalDelta < 0
                              ? "text-emerald-700"
                              : extrasPaymentBreakdown.rentalDelta > 0
                                ? "text-amber-700"
                                : "text-slate-500",
                          )}
                        >
                          ({formatSignedMoney(extrasPaymentBreakdown.rentalDelta)})
                        </span>
                      </span>
                    </div>
                  </>
                ) : null}
                {extrasPaymentBreakdown.locationsChanged ||
                extrasPaymentBreakdown.deliveryDelta !== 0 ? (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="font-semibold text-slate-500">
                      {locale === "ka"
                        ? "დელივერი"
                        : locale === "ru"
                          ? "Доставка"
                          : "Delivery"}
                    </span>
                    <span className="text-right font-extrabold tabular-nums text-[#0b1f4b]">
                      €{extrasPaymentBreakdown.originalDelivery.toFixed(2)}
                      <span className="mx-1.5 text-slate-300">→</span>
                      €{extrasPaymentBreakdown.projectedDelivery.toFixed(2)}
                      <span
                        className={cn(
                          "ml-1.5 text-xs font-bold",
                          extrasPaymentBreakdown.deliveryDelta < 0
                            ? "text-emerald-700"
                            : extrasPaymentBreakdown.deliveryDelta > 0
                              ? "text-amber-700"
                              : "text-slate-500",
                        )}
                      >
                        ({formatSignedMoney(extrasPaymentBreakdown.deliveryDelta)})
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-[#0b1f4b] px-3 py-2.5 text-white">
                <span className="text-xs font-bold uppercase tracking-wide opacity-90">
                  {locale === "ka"
                    ? "განახლებული ჯამი"
                    : locale === "ru"
                      ? "Обновлённая сумма"
                      : "Updated total"}
                </span>
                <span className="text-base font-black tabular-nums">
                  €{liveTotal.toFixed(2)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cn("grid sm:grid-cols-2", calendarView ? "gap-1.5" : compact ? "gap-1.5" : "gap-2.5")}>
          {(canEditAll || canEditGuestFields) && !readOnly ? (
            <>
              <button
                type="button"
                onClick={() => setEditingDates(true)}
                className={cn(
                  "text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]/40",
                  calendarView
                    ? "rounded-lg border border-emerald-100 bg-emerald-50/40 px-2 py-1.5 hover:border-emerald-300 hover:bg-emerald-50"
                    : compact
                      ? "rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 py-1.5 hover:border-emerald-300 hover:bg-emerald-50"
                      : "rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm",
                )}
                aria-label={t.editDates}
              >
                <p
                  className={cn(
                    "font-extrabold uppercase tracking-wide text-emerald-800",
                    calendarView ? "text-[10px]" : "text-[11px]",
                  )}
                >
                  {t.pickup}
                </p>
                <p
                  className={cn(
                    "font-extrabold text-[#0b1f4b]",
                    calendarView ? "mt-0.5 text-xs" : "mt-1 text-sm",
                  )}
                >
                  {formatWhen(booking.pickupAt, locale)}
                </p>
                <p
                  className={cn(
                    "font-semibold leading-snug text-slate-600",
                    calendarView ? "mt-0.5 text-[10px]" : "mt-0.5 text-xs",
                  )}
                >
                  {pickupPlace}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setEditingDates(true)}
                className={cn(
                  "text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6fe8]/40",
                  calendarView
                    ? "rounded-lg border border-sky-100 bg-sky-50/40 px-2 py-1.5 hover:border-sky-300 hover:bg-sky-50"
                    : compact
                      ? "rounded-lg border border-sky-100 bg-sky-50/40 px-2.5 py-1.5 hover:border-sky-300 hover:bg-sky-50"
                      : "rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-sm",
                )}
                aria-label={t.editDates}
              >
                <p
                  className={cn(
                    "font-extrabold uppercase tracking-wide text-sky-800",
                    calendarView ? "text-[10px]" : "text-[11px]",
                  )}
                >
                  {t.dropoff}
                </p>
                <p
                  className={cn(
                    "font-extrabold text-[#0b1f4b]",
                    calendarView ? "mt-0.5 text-xs" : "mt-1 text-sm",
                  )}
                >
                  {formatWhen(booking.dropoffAt, locale)}
                </p>
                <p
                  className={cn(
                    "font-semibold leading-snug text-slate-600",
                    calendarView ? "mt-0.5 text-[10px]" : "mt-0.5 text-xs",
                  )}
                >
                  {dropoffPlace}
                </p>
              </button>
            </>
          ) : (
            <>
              <div
                className={cn(
                  calendarView
                    ? "rounded-lg border border-emerald-100 bg-emerald-50/40 px-2 py-1.5"
                    : compact
                      ? "rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 py-1.5"
                      : "rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5",
                )}
              >
                <p
                  className={cn(
                    "font-extrabold uppercase tracking-wide text-emerald-800",
                    calendarView ? "text-[10px]" : "text-[11px]",
                  )}
                >
                  {t.pickup}
                </p>
                <p
                  className={cn(
                    "font-extrabold text-[#0b1f4b]",
                    calendarView ? "mt-0.5 text-xs" : "mt-1 text-sm",
                  )}
                >
                  {formatWhen(booking.pickupAt, locale)}
                </p>
                <p
                  className={cn(
                    "font-semibold leading-snug text-slate-600",
                    calendarView ? "mt-0.5 text-[10px]" : "mt-0.5 text-xs",
                  )}
                >
                  {pickupPlace}
                </p>
              </div>
              <div
                className={cn(
                  calendarView
                    ? "rounded-lg border border-sky-100 bg-sky-50/40 px-2 py-1.5"
                    : compact
                      ? "rounded-lg border border-sky-100 bg-sky-50/40 px-2.5 py-1.5"
                      : "rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2.5",
                )}
              >
                <p
                  className={cn(
                    "font-extrabold uppercase tracking-wide text-sky-800",
                    calendarView ? "text-[10px]" : "text-[11px]",
                  )}
                >
                  {t.dropoff}
                </p>
                <p
                  className={cn(
                    "font-extrabold text-[#0b1f4b]",
                    calendarView ? "mt-0.5 text-xs" : "mt-1 text-sm",
                  )}
                >
                  {formatWhen(booking.dropoffAt, locale)}
                </p>
                <p
                  className={cn(
                    "font-semibold leading-snug text-slate-600",
                    calendarView ? "mt-0.5 text-[10px]" : "mt-0.5 text-xs",
                  )}
                >
                  {dropoffPlace}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
