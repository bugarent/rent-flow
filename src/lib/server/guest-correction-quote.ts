import "server-only";

import { computeBpProjectedTripSettlement, reconstructBpPreDiscountRental } from "@/lib/business-partner/referral-pricing";
import { resolveBookingDiscount } from "@/lib/pricing/booking-discount";
import { commissionableTripEur } from "@/lib/bookings/guest-cancellation";
import {
  computeProjectedTripSettlement,
  rentalDayCount,
  roundMoney,
} from "@/lib/cars/reserve-pricing";
import { effectiveOneWayDeliveryPrice } from "@/lib/delivery/pricing";
import type { BookedTerms } from "@/lib/server/booking-terms-store";

export type GuestCorrectionMoney = {
  payNow: number;
  projectedTotal: number;
  nextDepositPaidEur: number;
  nextBalanceDueEur: number;
};

type ExtraLine = { id: string; priceEur: number };

/**
 * Site fee owed when a guest adds rental days or services.
 * Delivery stays off the commission. Returns payNow 0 when nothing commissionable was added.
 */
export async function quoteGuestBookingCorrection(input: {
  /** Legs at the booked places keep the delivery price from checkout. */
  bookingId?: string;
  carId: string;
  promoCode?: string | null;
  /** Site discount stored for this booking at checkout (0 = none). */
  siteDiscountPercent?: number;
  depositPercent: number;
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  oldPickupAt: string;
  oldDropoffAt: string;
  newPickupAt: string;
  newDropoffAt: string;
  oldPickupIata: string;
  oldDropoffIata: string;
  newPickupIata: string;
  newDropoffIata: string;
  oldExtras: ExtraLine[];
  newExtras: ExtraLine[];
}): Promise<GuestCorrectionMoney> {
  const oldDays = rentalDayCount(input.oldPickupAt, input.oldDropoffAt);
  const newDays = rentalDayCount(input.newPickupAt, input.newDropoffAt);
  const oldExtrasEur = roundMoney(
    input.oldExtras.reduce((sum, line) => sum + Math.max(0, Number(line.priceEur) || 0), 0),
  );
  const newExtrasEur = roundMoney(
    input.newExtras.reduce((sum, line) => sum + Math.max(0, Number(line.priceEur) || 0), 0),
  );
  const oldIds = new Set(input.oldExtras.map((line) => line.id));
  const newExtrasCommissionableEur = roundMoney(
    input.newExtras.reduce(
      (sum, line) =>
        oldIds.has(line.id) ? sum : sum + Math.max(0, Number(line.priceEur) || 0),
      0,
    ),
  );

  const { readBookedTerms } = await import("@/lib/server/booking-terms-store");
  const terms = input.bookingId ? await readBookedTerms(input.bookingId) : null;
  const [originalDeliveryEur, projectedDeliveryEur] = await Promise.all([
    deliveryFeeEur(input.carId, input.oldPickupIata, input.oldDropoffIata, oldDays, terms),
    deliveryFeeEur(input.carId, input.newPickupIata, input.newDropoffIata, newDays, terms),
  ]);

  const discount = resolveBookingDiscount({
    promoCode: input.promoCode,
    siteDiscountPercent: input.siteDiscountPercent,
  });
  const originalRentalEur = discount
    ? reconstructBpPreDiscountRental({
        totalPriceEur: input.totalPriceEur,
        depositPaidEur: input.depositPaidEur,
        extrasEur: oldExtrasEur,
        deliveryEur: originalDeliveryEur,
        discountPercent: discount.percent,
      })
    : roundMoney(
        Math.max(
          0,
          commissionableTripEur({
            totalPriceEur: input.totalPriceEur,
            depositPaidEur: input.depositPaidEur,
            deliveryEur: originalDeliveryEur,
          }) - oldExtrasEur,
        ),
      );
  const daily = oldDays > 0 ? originalRentalEur / oldDays : originalRentalEur;
  const projectedRentalEur = roundMoney(Math.max(0, daily) * newDays);

  const shared = {
    originalRentalEur,
    originalExtrasEur: oldExtrasEur,
    originalDeliveryEur,
    projectedRentalEur,
    projectedExtrasEur: newExtrasEur,
    projectedDeliveryEur,
    depositPaidEur: input.depositPaidEur,
    balanceDueEur: input.balanceDueEur,
    depositPercent: input.depositPercent,
  };
  const settlement = discount
    ? computeBpProjectedTripSettlement({ ...shared, discount })
    : computeProjectedTripSettlement({
        ...shared,
        newExtrasCommissionableEur,
      });

  return {
    payNow: settlement.payNow,
    projectedTotal: settlement.projectedTotal,
    nextDepositPaidEur: settlement.nextDepositPaidEur,
    nextBalanceDueEur: settlement.nextBalanceDueEur,
  };
}

function bookedLegFee(terms: BookedTerms | null, iata: string, days: number): number | null {
  if (!terms) return null;
  const code = iata.toUpperCase();
  const row = terms.locations.find((o) => o.iata.toUpperCase() === code);
  if (row) return roundMoney(effectiveOneWayDeliveryPrice(Number(row.priceEur) || 0, row.freeAfterDays ?? null, days));
  if (code === terms.pickupIata) return roundMoney(terms.delivery.pickupFeeEur);
  if (code === terms.dropoffIata) return roundMoney(terms.delivery.dropoffFeeEur);
  return null;
}

async function deliveryFeeEur(
  carId: string,
  pickupIata: string,
  dropoffIata: string,
  days: number,
  terms: BookedTerms | null,
): Promise<number> {
  const bookedPickup = bookedLegFee(terms, pickupIata, days);
  const bookedDropoff = bookedLegFee(terms, dropoffIata, days);
  if (bookedPickup != null && bookedDropoff != null) return roundMoney(bookedPickup + bookedDropoff);
  if (bookedPickup != null || bookedDropoff != null) {
    const live = await liveDeliveryLegs(carId, pickupIata, dropoffIata, days);
    return roundMoney((bookedPickup ?? live.pickup) + (bookedDropoff ?? live.dropoff));
  }
  const live = await liveDeliveryLegs(carId, pickupIata, dropoffIata, days);
  return roundMoney(live.pickup + live.dropoff);
}

async function liveDeliveryLegs(
  carId: string,
  pickupIata: string,
  dropoffIata: string,
  days: number,
): Promise<{ pickup: number; dropoff: number }> {
  const legs = (summary: { pickupFeeEur?: number; dropoffFeeEur?: number } | null | undefined) => ({
    pickup: roundMoney(Number(summary?.pickupFeeEur) || 0),
    dropoff: roundMoney(Number(summary?.dropoffFeeEur) || 0),
  });
  const { resolveDeliverySummary } = await import("@/lib/server/booking-info/delivery");
  try {
    const { listFileCars } = await import("@/lib/server/partner-cars-store");
    const car = (await listFileCars()).find((row) => row.id === carId);
    if (car) {
      const summary = await resolveDeliverySummary({
        deliveryPrices: car.deliveryPrices,
        pickupIata,
        dropoffIata,
        rentalDays: days,
        partnerId: car.partnerId,
        partnerUserId: car.partnerUserId,
      });
      return legs(summary);
    }
  } catch {
    /* try the database listing */
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: {
        partnerId: true,
        deliveryPrices: {
          select: {
            deliveryLocationId: true,
            priceEur: true,
            freeAfterDays: true,
            travelTimeMinutes: true,
          },
        },
      },
    });
    if (!car) return legs(null);
    const summary = await resolveDeliverySummary({
      deliveryPrices: car.deliveryPrices.map((row) => ({
        deliveryLocationId: row.deliveryLocationId,
        priceEur: Number(row.priceEur),
        freeAfterDays: row.freeAfterDays,
        travelTimeMinutes: row.travelTimeMinutes,
      })),
      pickupIata,
      dropoffIata,
      rentalDays: days,
      partnerId: car.partnerId,
    });
    return legs(summary);
  } catch {
    return legs(null);
  }
}
