import "server-only";

import { roundMoney } from "@/lib/cars/reserve-pricing";
import { persistedBookingCharge } from "@/lib/bookings/booking-money";
import type { FileBookingRecord } from "@/lib/server/customer-bookings-store";
import { listFileCars } from "@/lib/server/partner-cars-store";
import {
  carDailyRateFromListing,
  resolvedDiscountPercentForBooking,
} from "@/lib/server/booking-info/from-file";
import { resolveDeliverySummary } from "@/lib/server/booking-info/delivery";

function rentalDays(pickupAt: string, dropoffAt: string): number {
  const start = new Date(pickupAt).getTime();
  const end = new Date(dropoffAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

function closeEnough(stored: number, next: number): boolean {
  return Math.abs((Number(stored) || 0) - next) <= 0.001;
}

/**
 * Rewrites every open booking so stored total, online charge, and on-site balance
 * are the cent settlement of the discounted rental, named extras, and delivery.
 * Cancelled rows are left as recorded.
 */
export async function applyCanonicalMoney(bookings: FileBookingRecord[]): Promise<boolean> {
  const open = bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "UNFULFILLED");
  if (!open.length) return false;

  const cars = await listFileCars();
  const byId = new Map(cars.map((car) => [car.id, car]));
  let changed = false;

  for (const booking of open) {
    const car = byId.get(booking.carId);
    if (!car) continue;
    const days = rentalDays(booking.pickupAt, booking.dropoffAt);
    const discountPercent = await resolvedDiscountPercentForBooking({
      carId: booking.carId,
      pickupAt: booking.pickupAt,
      dropoffAt: booking.dropoffAt,
    });
    const daily = carDailyRateFromListing(
      Number(car.dailyRateEur) || 0,
      car.description,
      days,
      discountPercent,
    );
    if (!(daily > 0)) continue;

    const rentalEur = roundMoney(daily * days);
    const extrasEur = roundMoney(
      (booking.extras || []).reduce((sum, extra) => sum + Math.max(0, Number(extra.priceEur) || 0), 0),
    );
    let deliveryEur = 0;
    try {
      const delivery = await resolveDeliverySummary({
        deliveryPrices: car.deliveryPrices,
        pickupIata: booking.pickupAirportIata,
        dropoffIata: booking.dropoffAirportIata,
        rentalDays: days,
        partnerId: car.partnerId,
        partnerUserId: car.partnerUserId,
      });
      deliveryEur = roundMoney(Number(delivery?.totalFeeEur) || 0);
    } catch {
      deliveryEur = 0;
    }

    const charge = persistedBookingCharge({
      rentalEur,
      extrasEur,
      deliveryEur,
      depositPercent: booking.depositPercent,
    });
    if (
      closeEnough(booking.totalPriceEur, charge.totalPriceEur) &&
      closeEnough(booking.depositPaidEur, charge.depositPaidEur) &&
      closeEnough(booking.balanceDueEur, charge.balanceDueEur)
    ) {
      continue;
    }
    booking.totalPriceEur = charge.totalPriceEur;
    booking.depositPaidEur = charge.depositPaidEur;
    booking.balanceDueEur = charge.balanceDueEur;
    booking.updatedAt = new Date().toISOString();
    changed = true;
  }

  return changed;
}
