import {
  CARD_PICKUP_SURCHARGE_PERCENT,
  computeSiteServiceFee,
  roundMoney,
} from "@/lib/cars/reserve-pricing";

/** Free cancellation of the prepaid site fee, without extra protection. */
export const FREE_CANCEL_HOURS = 48;
/**
 * With cancellation protection, the site service commission is refunded when
 * pickup is still at least this many hours away. Inside this window the
 * commission is kept.
 */
export const PROTECTION_CANCEL_HOURS = 2;

export const CANCELLATION_PROTECTION_ID = "cancellation-protection";

export function hoursUntilPickup(pickupAt: string, now = Date.now()) {
  const pickup = new Date(pickupAt).getTime();
  if (!Number.isFinite(pickup)) return 0;
  return (pickup - now) / (60 * 60 * 1000);
}

export function hasCancellationProtection(extras?: Array<{ id?: string }>) {
  return (extras || []).some((extra) => extra.id === CANCELLATION_PROTECTION_ID);
}

/**
 * Trip amount the site % applies to: rental + extras (delivery excluded).
 * When delivery is unknown, strip only the card surcharge from the stored total.
 */
export function commissionableTripEur(input: {
  totalPriceEur: number;
  depositPaidEur: number;
  deliveryEur?: number;
}) {
  const depositPaid = roundMoney(Math.max(0, Number(input.depositPaidEur) || 0));
  const depositBase = roundMoney(depositPaid / (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100));
  const cardSurcharge = roundMoney(Math.max(0, depositPaid - depositBase));
  const delivery = roundMoney(Math.max(0, Number(input.deliveryEur) || 0));
  return roundMoney(Math.max(0, (Number(input.totalPriceEur) || 0) - cardSurcharge - delivery));
}

/**
 * Prepaid site-service fee (admin depositPercent of the full commissionable trip)
 * is refunded when pickup is at least 48 hours away, or when cancellation
 * protection is on and pickup is still at least 2 hours away.
 * Card surcharge on the deposit is not refunded.
 */
export function guestCancelSettlement(input: {
  pickupAt: string;
  extras?: Array<{ id?: string }>;
  depositPaidEur: number;
  depositPercent: number;
  /** Rental + extras; exclude delivery. Pre-discount when BP promo was used. */
  commissionableEur: number;
  now?: number;
  /**
   * When set, use this site-fee amount (e.g. BP settle) instead of deposit% × commissionable.
   */
  siteFeeEurOverride?: number;
}) {
  const hours = hoursUntilPickup(input.pickupAt, input.now ?? Date.now());
  const protection = hasCancellationProtection(input.extras);
  const eligible =
    hours >= FREE_CANCEL_HOURS || (protection && hours >= PROTECTION_CANCEL_HOURS);

  const fee = computeSiteServiceFee({
    commissionableEur: input.commissionableEur,
    depositPercent: input.depositPercent,
  });
  const paidBase = roundMoney(
    Math.max(0, Number(input.depositPaidEur) || 0) /
      (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100),
  );
  const formulaRefund =
    input.siteFeeEurOverride != null && Number.isFinite(input.siteFeeEurOverride)
      ? roundMoney(Math.max(0, Number(input.siteFeeEurOverride)))
      : fee.payNowBase;
  const refundEur = eligible
    ? roundMoney(
        paidBase > 0.02 ? Math.min(formulaRefund, paidBase) : formulaRefund,
      )
    : 0;

  return {
    hours,
    protection,
    refundable: refundEur > 0,
    refundEur,
    depositPercent: fee.depositPercent,
    /** Site % of the full booking (before eligibility). */
    siteFeeEur: formulaRefund,
  };
}
