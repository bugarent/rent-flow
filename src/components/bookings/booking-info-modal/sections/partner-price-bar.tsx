"use client";

import { CARD_PICKUP_SURCHARGE_PERCENT } from "@/lib/cars/reserve-pricing";
import { displayBookingCharges } from "@/lib/bookings/booking-money";
import { usePartnerMoneyOptional } from "@/components/providers/partner-money-context";
import { cn } from "@/lib/utils";
import type { BookingInfoData, Copy } from "../types";

/**
 * Partner / calendar footer.
 * Amounts are stored in EUR; when PartnerMoneyProvider is present they convert
 * to the live top-bar currency instantly.
 */
export function PartnerPriceBar({
  t,
  booking,
  calendarView = false,
}: {
  t: Copy;
  booking: BookingInfoData;
  calendarView?: boolean;
}) {
  const moneyCtx = usePartnerMoneyOptional();
  const money = displayBookingCharges({
    totalPriceEur: booking.totalPriceEur,
    depositPaidEur: booking.depositPaidEur || 0,
    balanceDueEur: booking.balanceDueEur,
  });
  const fmt = (amountEur: number) =>
    moneyCtx ? moneyCtx.formatEur(amountEur) : `€${amountEur.toFixed(2)}`;

  return (
    <div
      className={cn(
        "z-10 shrink-0 bg-[#1d6fe8] text-white",
        calendarView ? "px-3 py-1.5 sm:px-3.5" : "px-4 py-3 sm:px-5",
      )}
    >
      <dl className={cn("grid grid-cols-3", calendarView ? "gap-2" : "gap-3")}>
        <div className="min-w-0">
          <dt
            className={cn(
              "truncate font-semibold leading-tight text-white/85",
              calendarView ? "text-[9px]" : "text-[11px] sm:text-xs",
            )}
          >
            {t.partnerGrandTotal}
          </dt>
          <dd
            className={cn(
              "mt-0.5 font-black tabular-nums",
              calendarView ? "text-xs" : "text-sm sm:text-base",
            )}
          >
            {fmt(money.tripEur)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt
            className={cn(
              "truncate font-semibold leading-tight text-white/85",
              calendarView ? "text-[9px]" : "text-[11px] sm:text-xs",
            )}
          >
            {t.partnerPaid}
          </dt>
          <dd
            className={cn(
              "mt-0.5 font-black tabular-nums",
              calendarView ? "text-xs" : "text-sm sm:text-base",
            )}
          >
            {fmt(money.siteFeeEur)}
          </dd>
          {money.cardSurchargeEur >= 0.02 ? (
            <p
              className={cn(
                "font-semibold tabular-nums text-white/75",
                calendarView ? "text-[8px] leading-tight" : "text-[10px] leading-tight",
              )}
            >
              +{CARD_PICKUP_SURCHARGE_PERCENT}% {fmt(money.cardSurchargeEur)}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <dt
            className={cn(
              "truncate font-semibold leading-tight text-white/85",
              calendarView ? "text-[9px]" : "text-[11px] sm:text-xs",
            )}
          >
            {t.partnerDueAtPickup}
          </dt>
          <dd
            className={cn(
              "mt-0.5 font-black tabular-nums",
              calendarView ? "text-xs" : "text-sm sm:text-base",
            )}
          >
            {fmt(money.dueAtPickupEur)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
