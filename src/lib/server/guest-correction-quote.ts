import "server-only";

import { bookingHasBusinessPartnerPromo, computeBpProjectedTripSettlement, reconstructBpPreDiscountRental } from "@/lib/business-partner/referral-pricing";
import { commissionableTripEur } from "@/lib/bookings/guest-cancellation";
import {
  computeProjectedTripSettlement,
  rentalDayCount,
  roundMoney,
} from "@/lib/cars/reserve-pricing";

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
  carId: string;
  promoCode?: string | null;
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

  const [originalDeliveryEur, projectedDeliveryEur] = await Promise.all([
    deliveryFeeEur(input.carId, input.oldPickupIata, input.oldDropoffIata, oldDays),
    deliveryFeeEur(input.carId, input.newPickupIata, input.newDropoffIata, newDays),
  ]);

  const bp = bookingHasBusinessPartnerPromo(input.promoCode);
  const originalRentalEur = bp
    ? reconstructBpPreDiscountRental({
        totalPriceEur: input.totalPriceEur,
        depositPaidEur: input.depositPaidEur,
        extrasEur: oldExtrasEur,
        deliveryEur: originalDeliveryEur,
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
  const settlement = bp
    ? computeBpProjectedTripSettlement(shared)
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

async function deliveryFeeEur(
  carId: string,
  pickupIata: string,
  dropoffIata: string,
  days: number,
): Promise<number> {
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
      return roundMoney(Number(summary?.totalFeeEur) || 0);
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
    if (!car) return 0;
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
    return roundMoney(Number(summary?.totalFeeEur) || 0);
  } catch {
    return 0;
  }
}
