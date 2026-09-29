"use client";

import type { Dispatch, SetStateAction } from "react";
import { Car as CarIcon, Check, Fuel, Gauge, Settings2, Snowflake, Users } from "lucide-react";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import { pickServiceLabel } from "@/lib/extras/service-label";
import { knownText } from "@/lib/i18n/known-record-text";
import { cn } from "@/lib/utils";
import { usePartnerMoneyOptional } from "@/components/providers/partner-money-context";
import { fuelLabel, transmissionLabel, daysBetween } from "../helpers";
import type {
  BookingInfoData,
  BookingInfoExtra,
  BookingInfoRole,
  CatalogExtra,
  Copy,
  LiveDelivery,
} from "../types";

export function CarAside({
  t,
  locale,
  booking,
  role,
  daily,
  periodDays,
  liveDelivery,
  extras,
  resolvedCatalog,
  selectedExtraIds,
  setSelectedExtraIds,
  canEditGuestFields,
  canEditAll,
  canEditExtras,
  readOnly,
  calendarView = false,
  compact = false,
}: {
  t: Copy;
  locale: string;
  booking: BookingInfoData;
  role: BookingInfoRole;
  daily: number;
  periodDays: number;
  liveDelivery: LiveDelivery;
  extras: BookingInfoExtra[];
  resolvedCatalog: CatalogExtra[];
  selectedExtraIds: Set<string>;
  setSelectedExtraIds: Dispatch<SetStateAction<Set<string>>>;
  canEditGuestFields: boolean;
  canEditAll: boolean;
  canEditExtras: boolean;
  readOnly: boolean;
  calendarView?: boolean;
  /** Customer booking-lookup dialog — smaller car photo. */
  compact?: boolean;
}) {
  const moneyCtx = usePartnerMoneyOptional();
  const money = (amountEur: number, digits = 2) =>
    moneyCtx
      ? moneyCtx.formatEur(amountEur)
      : `€${Number(amountEur).toFixed(digits)}`;

  return (
    <aside
      className={cn(
        "lg:col-start-2 lg:row-start-1 lg:self-start",
        calendarView || compact ? "space-y-2" : "space-y-3",
      )}
    >
      <div
        className={cn(
          "overflow-hidden bg-white shadow-sm",
          calendarView
            ? "rounded-lg border-2 border-slate-300"
            : "rounded-xl border border-slate-200",
        )}
      >
        {calendarView ? (
          <div className="flex justify-center bg-slate-50 px-1.5 py-1.5">
            <div className="h-12 w-[4.5rem] overflow-hidden rounded bg-slate-100 sm:h-14 sm:w-20">
              {booking.car.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.car.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <CarIcon className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        ) : compact ? (
          <div className="flex justify-center bg-slate-50 px-2 py-2">
            <div className="h-28 w-40 overflow-hidden rounded-md bg-slate-100 sm:h-32 sm:w-44">
              {booking.car.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.car.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <CarIcon className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] bg-slate-100">
            {booking.car.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={booking.car.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <CarIcon className="h-10 w-10" />
              </div>
            )}
          </div>
        )}
        <div
          className={cn(
            "border-b border-slate-100",
            calendarView || compact ? "space-y-1.5 p-2" : "space-y-2 p-3",
          )}
        >
          {booking.partner?.companyName ? (
            <p
              className={cn(
                "font-bold text-slate-500",
                calendarView ? "text-[10px]" : "text-xs",
              )}
            >
              {booking.partner.companyName}
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "font-extrabold text-[#0b1f4b]",
                calendarView && "text-xs leading-snug",
              )}
            >
              {booking.car.make} {booking.car.model}
              {booking.car.year ? ` · ${booking.car.year}` : ""}
            </p>
            <p className="shrink-0 text-right">
              <span
                className={cn(
                  "block font-black tabular-nums text-[#1d6fe8]",
                  calendarView ? "text-xs" : "text-sm",
                )}
              >
                {money(daily)}
              </span>
              <span
                className={cn(
                  "font-bold uppercase text-slate-400",
                  calendarView ? "text-[9px]" : "text-[10px]",
                )}
              >
                {t.perDay}
              </span>
            </p>
          </div>
          <div
            className={cn(
              "flex flex-wrap font-bold text-slate-600",
              calendarView ? "gap-1 text-[9px]" : "gap-1.5 text-[10px]",
            )}
          >
            {booking.car.transmission ? (
              <span
                className={cn(
                  "inline-flex items-center rounded bg-slate-100",
                  calendarView ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-1",
                )}
              >
                <Settings2 className={calendarView ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {transmissionLabel(booking.car.transmission, locale)}
              </span>
            ) : null}
            {booking.car.fuelType ? (
              <span
                className={cn(
                  "inline-flex items-center rounded bg-slate-100",
                  calendarView ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-1",
                )}
              >
                <Fuel className={calendarView ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {fuelLabel(booking.car.fuelType, locale)}
              </span>
            ) : null}
            {booking.car.engineVolume ? (
              <span
                className={cn(
                  "inline-flex items-center rounded bg-slate-100",
                  calendarView ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-1",
                )}
              >
                <Gauge className={calendarView ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {booking.car.engineVolume}
              </span>
            ) : null}
            {booking.car.seats != null ? (
              <span
                className={cn(
                  "inline-flex items-center rounded bg-slate-100",
                  calendarView ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-1",
                )}
              >
                <Users className={calendarView ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {booking.car.seats}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center rounded bg-slate-100",
                calendarView ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-1",
              )}
            >
              <Snowflake className={calendarView ? "h-2.5 w-2.5" : "h-3 w-3"} />
              A/C
            </span>
          </div>
        </div>

        <div className={cn(calendarView ? "space-y-2 p-2" : "space-y-3 p-3")}>
          {calendarView ? (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-[#0b1f4b] shadow-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{t.carRental}</p>
                  <p className="text-[10px] font-medium leading-snug text-slate-500">
                    {t.dailyTimesDays
                      .replace("{price}", money(daily))
                      .replace("{n}", String(periodDays))}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums">
                  {money(roundMoney(daily * periodDays))}
                </span>
              </div>
              {liveDelivery.pickupIata || booking.delivery ? (
                <>
                  <div className="flex items-start justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-[#0b1f4b] shadow-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.deliveryPickupTitle}</p>
                      <p className="text-[10px] font-medium leading-snug text-slate-500">
                        - {liveDelivery.pickupLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums">
                      {money(liveDelivery.pickupFeeEur, 0)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-[#0b1f4b] shadow-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.deliveryReturnTitle}</p>
                      <p className="text-[10px] font-medium leading-snug text-slate-500">
                        - {liveDelivery.dropoffLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums">
                      {money(liveDelivery.dropoffFeeEur, 0)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-sm text-[#0b1f4b]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{t.carRental}</p>
                  <p className="text-xs font-medium leading-snug text-slate-500">
                    {t.dailyTimesDays
                      .replace("{price}", money(daily))
                      .replace("{n}", String(periodDays))}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums">
                  {money(roundMoney(daily * periodDays))}
                </span>
              </div>
              {liveDelivery.pickupIata || booking.delivery ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.deliveryPickupTitle}</p>
                      <p className="text-xs font-medium leading-snug text-slate-500">
                        - {liveDelivery.pickupLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums">
                      {money(liveDelivery.pickupFeeEur, 0)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.deliveryReturnTitle}</p>
                      <p className="text-xs font-medium leading-snug text-slate-500">
                        - {liveDelivery.dropoffLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums">
                      {money(liveDelivery.dropoffFeeEur, 0)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div>
            <p
              className={cn(
                "font-bold uppercase tracking-wide text-slate-400",
                calendarView ? "text-[10px]" : "text-xs",
              )}
            >
              {t.selectedOptions}
            </p>
            {extras.length === 0 && !booking.pendingChanges?.extras?.length ? (
              <p className={cn("text-slate-500", calendarView || compact ? "mt-1 text-xs" : "mt-2 text-sm")}>
                {t.noOptions}
              </p>
            ) : (
              <ul className={cn(calendarView || compact ? "mt-1 space-y-1" : "mt-2 space-y-1.5")}>
                {extras.map((ex) => {
                  const catalog = resolvedCatalog.find((c) => c.id === ex.id);
                  const label = knownText(locale, pickServiceLabel(catalog?.label, ex.label));
                  if (!label) return null;
                  const bookingDays = Math.max(
                    1,
                    daysBetween(booking.pickupAt, booking.dropoffAt),
                  );
                  const bookedLine = Number(ex.priceEur) || 0;
                  const liveExtra =
                    catalog && (canEditGuestFields || canEditAll)
                      ? roundMoney(
                          extraPeriodCharge(
                            bookedLine > 0
                              ? roundMoney(bookedLine / bookingDays)
                              : catalog.priceEurPerDay,
                            periodDays,
                            1,
                            catalog.maxPeriodEur,
                          ),
                        )
                      : bookedLine;
                  return (
                    <li
                      key={ex.id}
                      className={cn(
                        "flex justify-between gap-2 font-semibold text-emerald-900",
                        calendarView ? "items-start" : "items-center",
                        calendarView
                          ? "rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-xs shadow-sm"
                          : compact
                            ? "rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] shadow-sm"
                            : "rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm",
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Check
                          className={
                            calendarView || compact
                              ? "h-3 w-3 shrink-0"
                              : "h-3.5 w-3.5 shrink-0"
                          }
                        />
                        <span className={calendarView ? "whitespace-normal break-words" : "truncate"}>
                          {label}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold">{money(liveExtra)}</span>
                    </li>
                  );
                })}
                {(booking.pendingChanges?.extras || []).map((ex) => {
                  const label = knownText(locale, pickServiceLabel(ex.label));
                  if (!label) return null;
                  return (
                    <li
                      key={`pending-${ex.id}`}
                      className={cn(
                        "flex justify-between gap-2 text-amber-950",
                        calendarView ? "items-start" : "items-center",
                        calendarView
                          ? "rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs shadow-sm"
                          : compact
                            ? "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] shadow-sm"
                            : "rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm ring-1 ring-amber-200",
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold">
                        <Check
                          className={
                            calendarView || compact
                              ? "h-3 w-3 shrink-0"
                              : "h-3.5 w-3.5 shrink-0"
                          }
                        />
                        <span className={calendarView ? "whitespace-normal break-words" : "truncate"}>
                          {label}
                          {role !== "guest" ? " (pending)" : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold">{money(Number(ex.priceEur) || 0)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!readOnly && resolvedCatalog.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {t.availableOptions}
              </p>
              <div className="mt-2 space-y-2">
                {resolvedCatalog.map((ex) => {
                  const optionLabel = knownText(locale, pickServiceLabel(ex.label));
                  if (!optionLabel) return null;
                  const checked = selectedExtraIds.has(ex.id) || Boolean(ex.locked);
                  const locked = Boolean(ex.locked);
                  const canToggle = canEditExtras && !readOnly && !locked;
                  const periodPrice = roundMoney(
                    extraPeriodCharge(ex.priceEurPerDay, periodDays, 1, ex.maxPeriodEur),
                  );
                  return (
                    <label
                      key={ex.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-sm",
                        checked
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-slate-200 bg-white",
                        canToggle ? "cursor-pointer" : "cursor-default opacity-80",
                        locked && "border-slate-300 bg-slate-50",
                      )}
                      title={locked ? t.mandatoryLocked : undefined}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          disabled={!canToggle}
                          checked={checked}
                          onChange={() => {
                            if (!canToggle || locked) return;
                            setSelectedExtraIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(ex.id)) next.delete(ex.id);
                              else next.add(ex.id);
                              return next;
                            });
                          }}
                        />
                        <span className="min-w-0 truncate">
                          {optionLabel}
                          {locked ? (
                            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              ({t.mandatory})
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs font-bold text-slate-700">
                        <span className="block">{money(periodPrice)}</span>
                        <span className="font-medium text-slate-500">
                          {money(ex.priceEurPerDay)} × {periodDays}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
