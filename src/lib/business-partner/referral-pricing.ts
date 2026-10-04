import { settleBookingMoney, type SettledBookingMoney } from "@/lib/bookings/booking-money";
import { centsToMoney, moneyToCents, roundMoney } from "@/lib/cars/reserve-pricing";
import { CARD_PICKUP_SURCHARGE_PERCENT } from "@/lib/cars/reserve-pricing";
import { BP_PROMO_DISCOUNT_PERCENT, type BookingDiscount } from "@/lib/pricing/booking-discount";

/** Customer discount on rental + extras (not delivery / return fees). */
export const BP_CUSTOMER_DISCOUNT_PERCENT = BP_PROMO_DISCOUNT_PERCENT;

const BP_DISCOUNT: BookingDiscount = {
  percent: BP_CUSTOMER_DISCOUNT_PERCENT,
  cardOnDiscountedFee: false,
};
/** Nominal site service share of commissionable (rental + extras). */
export const BP_SITE_SERVICE_PERCENT = 20;
/** Site share after funding the customer discount (20% − 5%). */
export const BP_SITE_AFTER_DISCOUNT_PERCENT = BP_SITE_SERVICE_PERCENT - BP_CUSTOMER_DISCOUNT_PERCENT;
/** Partner payout as a share of the site's remaining 15%. */
export const BP_PARTNER_OF_SITE_PERCENT = 40;

export type BusinessPartnerReferralSplit = {
  /** Undiscounted rental + extras. */
  commissionablePreDiscountEur: number;
  customerDiscountEur: number;
  /** Amount customer pays for rental + extras after 5%. */
  discountedCommissionableEur: number;
  /** Site program share used for partner attribution (15% of pre-discount). */
  siteEarnedEur: number;
  /** Partner share: 40% of siteEarnedEur. */
  partnerEarnedEur: number;
  /** Site keeps: 60% of siteEarnedEur. */
  siteKeptEur: number;
};

export function applyBusinessPartnerCustomerDiscount(
  amountEur: number,
  percent: number = BP_CUSTOMER_DISCOUNT_PERCENT,
): number {
  const base = Math.max(0, Number(amountEur) || 0);
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  return roundMoney(base * (1 - pct / 100));
}

/** True when this booking was charged with a business-partner promo code. */
export function bookingHasBusinessPartnerPromo(promoCode: string | null | undefined): boolean {
  return Boolean(String(promoCode || "").trim());
}

/**
 * Reconstruct pre-discount rental from persisted totals.
 * Extras on the booking are stored at full catalog price; the charged trip used −5% on rental+extras.
 */
export function reconstructBpPreDiscountRental(input: {
  totalPriceEur: number;
  depositPaidEur: number;
  extrasEur: number;
  deliveryEur: number;
  discountPercent?: number;
}): number {
  const depositPaid = roundMoney(Math.max(0, Number(input.depositPaidEur) || 0));
  const depositBase = roundMoney(depositPaid / (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100));
  const card = roundMoney(Math.max(0, depositPaid - depositBase));
  const delivery = roundMoney(Math.max(0, Number(input.deliveryEur) || 0));
  const extras = roundMoney(Math.max(0, Number(input.extrasEur) || 0));
  const tripWithoutCard = roundMoney(Math.max(0, (Number(input.totalPriceEur) || 0) - card));
  const discountedCommissionable = roundMoney(Math.max(0, tripWithoutCard - delivery));
  const factor = 1 - (input.discountPercent ?? BP_CUSTOMER_DISCOUNT_PERCENT) / 100;
  if (factor <= 0) return 0;
  const preCommissionable = roundMoney(discountedCommissionable / factor);
  return roundMoney(Math.max(0, preCommissionable - extras));
}


/**
 * Split for an attributed BP booking (partner ledger).
 * - Customer: −5% on commissionable (rental + services), delivery unchanged
 * - Site earned (attribution): 15% of pre-discount commissionable
 * - Partner: 40% of that 15%
 */
export function computeBusinessPartnerReferralSplit(
  commissionablePreDiscountEur: number,
  partnerOfSitePercent: number = BP_PARTNER_OF_SITE_PERCENT,
): BusinessPartnerReferralSplit {
  const commissionablePreDiscountEurSafe = roundMoney(
    Math.max(0, Number(commissionablePreDiscountEur) || 0),
  );
  const customerDiscountEur = roundMoney(
    (commissionablePreDiscountEurSafe * BP_CUSTOMER_DISCOUNT_PERCENT) / 100,
  );
  const discountedCommissionableEur = roundMoney(
    commissionablePreDiscountEurSafe - customerDiscountEur,
  );
  const siteEarnedEur = roundMoney(
    (commissionablePreDiscountEurSafe * BP_SITE_AFTER_DISCOUNT_PERCENT) / 100,
  );
  const pct = Math.min(100, Math.max(0, Number(partnerOfSitePercent) || BP_PARTNER_OF_SITE_PERCENT));
  const partnerEarnedEur = roundMoney((siteEarnedEur * pct) / 100);
  const siteKeptEur = roundMoney(siteEarnedEur - partnerEarnedEur);
  return {
    commissionablePreDiscountEur: commissionablePreDiscountEurSafe,
    customerDiscountEur,
    discountedCommissionableEur,
    siteEarnedEur,
    partnerEarnedEur,
    siteKeptEur,
  };
}

/**
 * Customer-facing BP settlement:
 * - 5% off rental + extras only (delivery / return fees stay full price)
 * - Pay-on-site stays identical to the non-promo settlement
 * - The 5% is taken from the pay-now site fee only
 * - Card +3% is NOT discounted — kept at the pre-promo surcharge amount
 */
export function settleBusinessPartnerBookingMoney(input: {
  rentalEur: number;
  extrasEur: number;
  deliveryEur: number;
  depositPercent?: number;
  /** Override partner share of site’s 15% (volume tier). */
  partnerOfSitePercent?: number;
  /** Defaults to the BP promo (5%, card on the pre-discount fee). */
  discount?: BookingDiscount;
}): SettledBookingMoney & {
  split: BusinessPartnerReferralSplit;
  /** Undiscounted settlement (for strikethrough UI). */
  beforeDiscount: SettledBookingMoney;
} {
  const rentalPre = roundMoney(Math.max(0, input.rentalEur));
  const extrasPre = roundMoney(Math.max(0, input.extrasEur));
  const delivery = roundMoney(Math.max(0, input.deliveryEur));
  const split = computeBusinessPartnerReferralSplit(
    rentalPre + extrasPre,
    input.partnerOfSitePercent,
  );

  const beforeDiscount = settleBookingMoney({
    rentalEur: rentalPre,
    extrasEur: extrasPre,
    deliveryEur: delivery,
    depositPercent: input.depositPercent,
  });

  const discount = input.discount ?? BP_DISCOUNT;
  const rental = moneyToCents(applyBusinessPartnerCustomerDiscount(rentalPre, discount.percent));
  const extras = moneyToCents(applyBusinessPartnerCustomerDiscount(extrasPre, discount.percent));
  // Delivery / return location fees are never discounted.
  const deliveryCents = moneyToCents(delivery);
  const trip = rental + extras + deliveryCents;

  // Freeze pay-on-site at the standard (non-promo) amount.
  const onSiteRaw = moneyToCents(beforeDiscount.onSiteEur);
  // 5% comes out of the online site fee only. Clamp so a large on-site freeze
  // cannot break the trip invariant when delivery is small.
  const onSite = Math.min(onSiteRaw, trip);
  const site = Math.max(0, trip - onSite);
  // BP promo: card +3% stays on the original (pre-discount) site fee. Site discount: card follows the reduced fee.
  const card = discount.cardOnDiscountedFee
    ? Math.round((site * CARD_PICKUP_SURCHARGE_PERCENT) / 100)
    : moneyToCents(beforeDiscount.cardSurchargeEur);
  const online = site + card;
  const charged = trip + card;

  return {
    rentalEur: centsToMoney(rental),
    extrasEur: centsToMoney(extras),
    deliveryEur: centsToMoney(deliveryCents),
    tripEur: centsToMoney(trip),
    commissionableEur: centsToMoney(rental + extras),
    depositPercent: beforeDiscount.depositPercent,
    siteFeeEur: centsToMoney(site),
    cardSurchargeEur: centsToMoney(card),
    cardSurchargePercent: CARD_PICKUP_SURCHARGE_PERCENT,
    onlineEur: centsToMoney(online),
    onSiteEur: centsToMoney(onSite),
    chargedEur: centsToMoney(charged),
    split,
    beforeDiscount,
  };
}

/**
 * Same shape as computeProjectedTripSettlement, but rental/extras are pre-discount
 * catalog amounts and money follows settleBusinessPartnerBookingMoney (−5% on
 * rental+extras, delivery full, site fee absorbs the discount).
 */
export function computeBpProjectedTripSettlement(input: {
  originalRentalEur: number;
  originalExtrasEur: number;
  originalDeliveryEur: number;
  projectedRentalEur: number;
  projectedExtrasEur: number;
  projectedDeliveryEur: number;
  depositPaidEur: number;
  balanceDueEur?: number;
  depositPercent?: number;
  discount?: BookingDiscount;
}): {
  depositPercent: number;
  projectedComponents: number;
  projectedTotal: number;
  originalComponents: number;
  dueWas: number;
  dueWill: number;
  payNow: number;
  payNowBase: number;
  commissionableIncrease: number;
  onSiteCommissionableDelta: number;
  refundableSiteFeeEur: number;
  nextDepositPaidEur: number;
  nextBalanceDueEur: number;
  siteFeeEur: number;
  cardSurchargeEur: number;
} {
  const original = settleBusinessPartnerBookingMoney({
    rentalEur: input.originalRentalEur,
    extrasEur: input.originalExtrasEur,
    deliveryEur: input.originalDeliveryEur,
    depositPercent: input.depositPercent,
    discount: input.discount,
  });
  const projected = settleBusinessPartnerBookingMoney({
    rentalEur: input.projectedRentalEur,
    extrasEur: input.projectedExtrasEur,
    deliveryEur: input.projectedDeliveryEur,
    depositPercent: input.depositPercent,
    discount: input.discount,
  });

  const surchargeRate = CARD_PICKUP_SURCHARGE_PERCENT / 100;
  const storedDeposit = roundMoney(Math.max(0, input.depositPaidEur));
  const depositBasePaid =
    storedDeposit <= 0.02 ? 0 : roundMoney(storedDeposit / (1 + surchargeRate));

  const dueWas =
    input.balanceDueEur != null &&
    Number.isFinite(input.balanceDueEur) &&
    Math.abs(Number(input.balanceDueEur) - original.onSiteEur) <= 0.02
      ? roundMoney(Math.max(0, Number(input.balanceDueEur)))
      : original.onSiteEur;

  const siteDelta = roundMoney(original.siteFeeEur - projected.siteFeeEur);
  const refundableSiteFeeEur = roundMoney(
    Math.max(0, Math.min(depositBasePaid, siteDelta)),
  );

  const onlineDelta = roundMoney(projected.onlineEur - original.onlineEur);
  const payNow = roundMoney(Math.max(0, onlineDelta));
  const payNowBase = roundMoney(
    Math.max(0, projected.siteFeeEur - original.siteFeeEur),
  );

  const onSiteCommissionableDelta = roundMoney(
    projected.onSiteEur - original.onSiteEur,
  );

  return {
    depositPercent: projected.depositPercent,
    projectedComponents: projected.tripEur,
    projectedTotal: projected.chargedEur,
    originalComponents: original.tripEur,
    dueWas,
    dueWill: projected.onSiteEur,
    payNow,
    payNowBase,
    commissionableIncrease: roundMoney(
      Math.max(0, input.projectedExtrasEur - input.originalExtrasEur),
    ),
    onSiteCommissionableDelta,
    refundableSiteFeeEur,
    nextDepositPaidEur: projected.onlineEur,
    nextBalanceDueEur: projected.onSiteEur,
    siteFeeEur: projected.siteFeeEur,
    cardSurchargeEur: projected.cardSurchargeEur,
  };
}

/** Site-fee formula used for full booking cancel when the booking used a BP promo. */
export function bpCancelSiteFeeEur(input: {
  rentalEur: number;
  extrasEur: number;
  deliveryEur: number;
  depositPercent?: number;
  discount?: BookingDiscount;
}): number {
  return settleBusinessPartnerBookingMoney({
    rentalEur: input.rentalEur,
    extrasEur: input.extrasEur,
    deliveryEur: input.deliveryEur,
    depositPercent: input.depositPercent,
    discount: input.discount,
  }).siteFeeEur;
}

