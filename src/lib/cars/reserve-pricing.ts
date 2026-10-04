import type { CarDetailsBlob } from "@/lib/cars/car-details";

export const DEFAULT_DEPOSIT_PERCENT = 15;
/** Card payment fee applied to the booking-activation (pay-now) amount. */
export const CARD_PICKUP_SURCHARGE_PERCENT = 3;
/** Full protection ≈ 45% of daily rental rate (matches common OTA pricing). */
export const FULL_PROTECTION_DAILY_RATIO = 0.45;
/** Cancellation-protection fee per rental day (€). */
export const CANCELLATION_DAILY_EUR = 2.55;
/** @deprecated Use CANCELLATION_DAILY_EUR. */
export const CANCELLATION_FLAT_EUR = CANCELLATION_DAILY_EUR;
/** @deprecated Unused ratio — kept so older imports still resolve. */
export const CANCELLATION_DAILY_RATIO = 0;

export function rentalDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function resolveDailyRateEur(
  details: CarDetailsBlob | null,
  dailyRateEur: number,
  discountPercent: number,
  days: number,
): number {
  let base = dailyRateEur;
  const tiers = details?.pricingTiers;
  if (Array.isArray(tiers) && tiers.length) {
    const match = tiers.find((t) => {
      const from = Number(t.fromDays) || 1;
      const to = Number(t.toDays) || 9999;
      return days >= from && days <= to;
    });
    const tierPrice = match != null ? Number(match.priceEur) : NaN;
    if (Number.isFinite(tierPrice) && tierPrice > 0) base = tierPrice;
  }
  const discount = Number.isFinite(discountPercent) ? Math.min(100, Math.max(0, discountPercent)) / 100 : 0;
  return Math.max(0, base * (1 - discount));
}

export function roundMoney(n: number): number {
  return Number(n.toFixed(2));
}

/** Integer cents. All site-fee and invoice totals are summed in cents, then divided. */
export function moneyToCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function centsToMoney(cents: number): number {
  return cents / 100;
}

function clampDepositPercent(percent: number | undefined): number {
  const raw = percent ?? DEFAULT_DEPOSIT_PERCENT;
  if (!Number.isFinite(raw)) return DEFAULT_DEPOSIT_PERCENT;
  return Math.min(100, Math.max(0, Math.trunc(raw)));
}

/**
 * Site service / activation fee: percent of commissionable amount (rental + extras),
 * never pickup/return delivery location fees. Card surcharge applies on that fee only.
 * Percents are applied to integer cents so 20% and 3% cannot drift by a fraction of a cent.
 */
export function computeSiteServiceFee(input: {
  /** Rental + extras (+ protections); exclude delivery. */
  commissionableEur: number;
  depositPercent?: number;
}): {
  depositPercent: number;
  payNowBase: number;
  cardSurcharge: number;
  payNow: number;
} {
  const depositPercent = clampDepositPercent(input.depositPercent);
  const commissionable = Math.max(0, moneyToCents(input.commissionableEur));
  const payNowBase = Math.round((commissionable * depositPercent) / 100);
  const cardSurcharge = Math.round((payNowBase * CARD_PICKUP_SURCHARGE_PERCENT) / 100);
  return {
    depositPercent,
    payNowBase: centsToMoney(payNowBase),
    cardSurcharge: centsToMoney(cardSurcharge),
    payNow: centsToMoney(payNowBase + cardSurcharge),
  };
}

/**
 * Live settlement when a booking trip is edited.
 * - Full trip total = rental + extras + delivery (never deposit + stale balance).
 * - Added days and services charge the site service percent on the green pay button.
 * - Delivery changes stay on-site in full.
 * - Fewer rental days: on-site drops by the partner share; unused site-fee share is credited.
 */
export function computeProjectedTripSettlement(input: {
  originalRentalEur: number;
  originalExtrasEur: number;
  originalDeliveryEur: number;
  projectedRentalEur: number;
  projectedExtrasEur: number;
  projectedDeliveryEur: number;
  depositPaidEur: number;
  /** Stored balance — used only when it matches component math (avoids stale drift). */
  balanceDueEur?: number;
  depositPercent?: number;
  /**
   * Value of extras that were not on the booking before (pay-now commission base).
   * Day/location-only edits must pass 0.
   */
  newExtrasCommissionableEur?: number;
}): {
  depositPercent: number;
  /** Trip total: rental + extras + delivery (matches on-screen breakdown). */
  projectedComponents: number;
  /** Stored/create convention: components + card surcharge on the deposit. */
  projectedTotal: number;
  originalComponents: number;
  dueWas: number;
  dueWill: number;
  payNow: number;
  payNowBase: number;
  commissionableIncrease: number;
  onSiteCommissionableDelta: number;
  /** Site service % to refund when guest removes paid extras or shortens days. */
  refundableSiteFeeEur: number;
  nextDepositPaidEur: number;
  nextBalanceDueEur: number;
  /** Site percent of the trip that the online payment covers (excludes the card fee). */
  siteFeeEur: number;
  /** Card fee on the site percent only. */
  cardSurchargeEur: number;
} {
  const depositPercent = input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
  const surchargeRate = CARD_PICKUP_SURCHARGE_PERCENT / 100;
  const remainingRatio = (100 - Math.min(100, Math.max(0, depositPercent))) / 100;

  const originalRental = roundMoney(Math.max(0, input.originalRentalEur));
  const projectedRental = roundMoney(Math.max(0, input.projectedRentalEur));
  const originalExtras = roundMoney(Math.max(0, input.originalExtrasEur));
  const projectedExtras = roundMoney(Math.max(0, input.projectedExtrasEur));
  const originalDelivery = roundMoney(Math.max(0, input.originalDeliveryEur));
  const projectedDelivery = roundMoney(Math.max(0, input.projectedDeliveryEur));
  const newExtras = roundMoney(Math.max(0, input.newExtrasCommissionableEur ?? 0));

  const originalComponents = roundMoney(originalRental + originalExtras + originalDelivery);
  const projectedComponents = roundMoney(projectedRental + projectedExtras + projectedDelivery);

  const storedDeposit = roundMoney(Math.max(0, input.depositPaidEur));
  // Always trust money actually collected — never invent a higher formula deposit
  // (that previously inflated "დასაბრუნებელი" beyond what was prepaid).
  const depositBasePaid =
    storedDeposit <= 0.02 ? 0 : roundMoney(storedDeposit / (1 + surchargeRate));

  const dueFromComponents = roundMoney(Math.max(0, originalComponents - depositBasePaid));
  const storedDue =
    input.balanceDueEur != null && Number.isFinite(input.balanceDueEur)
      ? roundMoney(Math.max(0, Number(input.balanceDueEur)))
      : null;
  // Trust stored balance only when it agrees with component math (±2¢).
  const dueWas =
    storedDue != null && Math.abs(storedDue - dueFromComponents) <= 0.02
      ? storedDue
      : dueFromComponents;

  const existingExtrasProjected = roundMoney(Math.max(0, projectedExtras - newExtras));
  const tripDelta = roundMoney(
    projectedRental + existingExtrasProjected - (originalRental + originalExtras),
  );

  const projectedExistingFee = computeSiteServiceFee({
    commissionableEur: roundMoney(projectedRental + existingExtrasProjected),
    depositPercent,
  });

  let onSiteTripDelta: number;
  let depositCredit = 0;
  if (tripDelta < -0.02) {
    onSiteTripDelta = roundMoney(tripDelta * remainingRatio);
    // Site-fee credit = drop from prepaid base down to the fee owed on the
    // remaining trip. Cents-based via computeSiteServiceFee; never exceed paid.
    depositCredit = roundMoney(
      Math.max(0, Math.min(depositBasePaid, depositBasePaid - projectedExistingFee.payNowBase)),
    );
  } else if (tripDelta > 0.02) {
    // Partner share stays on site. The site percent of this increase is pay-now.
    onSiteTripDelta = roundMoney(tripDelta * remainingRatio);
  } else {
    onSiteTripDelta = tripDelta;
  }

  const onSiteNewExtras = roundMoney(newExtras * remainingRatio);
  const onSiteCommissionableDelta = roundMoney(onSiteTripDelta + onSiteNewExtras);
  // Site percent of added days and of services (new or grown with the extra days).
  const addedCommissionable = roundMoney(Math.max(0, tripDelta) + newExtras);
  const fee =
    addedCommissionable > 0.009
      ? computeSiteServiceFee({ commissionableEur: addedCommissionable, depositPercent })
      : { payNow: 0, payNowBase: 0, cardSurcharge: 0, depositPercent };

  const nextDepositBaseCents = Math.max(
    0,
    moneyToCents(depositBasePaid) - moneyToCents(depositCredit) + moneyToCents(fee.payNowBase),
  );
  const nextCardCents = Math.round((nextDepositBaseCents * CARD_PICKUP_SURCHARGE_PERCENT) / 100);
  const nextDepositPaidCents = nextDepositBaseCents + nextCardCents;
  const projectedCents = moneyToCents(projectedComponents);
  // Partner share of the trip (components minus site-fee base already / newly collected).
  const dueWillCents = Math.max(0, projectedCents - nextDepositBaseCents);
  const projectedTotalCents = projectedCents + nextCardCents;

  return {
    depositPercent,
    projectedComponents,
    projectedTotal: centsToMoney(projectedTotalCents),
    originalComponents,
    dueWas,
    dueWill: centsToMoney(dueWillCents),
    payNow: fee.payNow,
    payNowBase: fee.payNowBase,
    commissionableIncrease: addedCommissionable,
    onSiteCommissionableDelta,
    refundableSiteFeeEur: depositCredit,
    nextDepositPaidEur: centsToMoney(nextDepositPaidCents),
    nextBalanceDueEur: centsToMoney(dueWillCents),
    siteFeeEur: centsToMoney(nextDepositBaseCents),
    cardSurchargeEur: centsToMoney(nextCardCents),
  };
}

/**
 * Listing card daily price for search results:
 * (rental for selected days + pickup delivery + return delivery) ÷ days.
 * Example: 8/day × 10 + 10 + 10 = 100 → shows 10/day.
 */
export function listingDailyWithDeliveryEur(input: {
  dailyRateEur: number;
  days: number;
  pickupDeliveryFeeEur?: number;
  dropoffDeliveryFeeEur?: number;
  deliveryFeeEur?: number;
  details?: CarDetailsBlob | null;
  discountPercent?: number;
  /** Extra % off rental only (e.g. business-partner 5%); delivery fees stay full price. */
  referralDiscountPercent?: number;
}): {
  dailyRateEur: number;
  rentalTotalEur: number;
  deliveryFeeEur: number;
  totalEur: number;
  displayDailyEur: number;
  referralDiscountEur: number;
} {
  const days = Math.max(1, input.days || 1);
  const dailyRateEur = roundMoney(
    resolveDailyRateEur(
      input.details ?? null,
      input.dailyRateEur,
      input.discountPercent ?? 0,
      days,
    ),
  );
  let rentalTotalEur = roundMoney(dailyRateEur * days);
  const referralPct = Math.min(
    100,
    Math.max(0, Number(input.referralDiscountPercent) || 0),
  );
  const referralDiscountEur =
    referralPct > 0 ? roundMoney((rentalTotalEur * referralPct) / 100) : 0;
  if (referralDiscountEur > 0) {
    rentalTotalEur = roundMoney(rentalTotalEur - referralDiscountEur);
  }
  const pickup = Number(input.pickupDeliveryFeeEur) || 0;
  const dropoff = Number(input.dropoffDeliveryFeeEur) || 0;
  const deliveryFeeEur = roundMoney(
    pickup + dropoff > 0 ? pickup + dropoff : Number(input.deliveryFeeEur) || 0,
  );
  const totalEur = roundMoney(rentalTotalEur + deliveryFeeEur);
  const displayDailyEur = roundMoney(totalEur / days);
  return {
    dailyRateEur,
    rentalTotalEur,
    deliveryFeeEur,
    totalEur,
    displayDailyEur,
    referralDiscountEur,
  };
}

export function computeReserveTotals(input: {
  dailyRateEur: number;
  days: number;
  extrasTotalEur: number;
  fullProtection: boolean;
  cancellationProtection: boolean;
  depositPercent?: number;
  franchiseEur?: number;
}) {
  const days = Math.max(1, input.days);
  const rentalTotal = roundMoney(input.dailyRateEur * days);
  const protectionDaily = roundMoney(input.dailyRateEur * FULL_PROTECTION_DAILY_RATIO);
  const protectionTotal = input.fullProtection ? roundMoney(protectionDaily * days) : 0;
  const cancellationDaily = CANCELLATION_DAILY_EUR;
  const cancellationTotal = input.cancellationProtection
    ? roundMoney(cancellationDaily * days)
    : 0;
  const extrasTotal = roundMoney(input.extrasTotalEur + protectionTotal + cancellationTotal);
  const total = roundMoney(rentalTotal + extrasTotal);
  const depositPercent = input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
  const fee = computeSiteServiceFee({ commissionableEur: total, depositPercent });
  const payNow = fee.payNowBase;
  const payAtPickup = roundMoney(total - payNow);
  const remainingRental = roundMoney(rentalTotal - payNow);
  const franchise =
    input.franchiseEur != null && Number.isFinite(input.franchiseEur)
      ? input.franchiseEur
      : roundMoney(input.dailyRateEur * 120);

  return {
    days,
    rentalTotal,
    protectionDaily,
    protectionTotal,
    /** Per-day fee shown on the protection card. */
    cancellationDaily,
    cancellationTotal,
    extrasTotal,
    total,
    payNow,
    payAtPickup,
    remainingRental: Math.max(0, remainingRental),
    franchise,
    depositPercent,
  };
}
