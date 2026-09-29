import {
  CARD_PICKUP_SURCHARGE_PERCENT,
  centsToMoney,
  computeSiteServiceFee,
  moneyToCents,
  roundMoney,
} from "@/lib/cars/reserve-pricing";

export type SettledBookingMoney = {
  rentalEur: number;
  extrasEur: number;
  deliveryEur: number;
  /** Rental + extras + delivery. The trip the guest is renting. */
  tripEur: number;
  /** Rental + extras. Delivery is excluded from the site percent. */
  commissionableEur: number;
  depositPercent: number;
  /** Exact site percent of the commissionable trip. */
  siteFeeEur: number;
  cardSurchargeEur: number;
  cardSurchargePercent: number;
  /** Site fee + card surcharge. Charged online. */
  onlineEur: number;
  /** Trip minus the site fee. Charged on site. Delivery stays fully here. */
  onSiteEur: number;
  /** Trip + card surcharge. Equals online + on site. */
  chargedEur: number;
};

/**
 * One settlement for the booking panel and the invoice.
 * Sums are integer cents. site + onSite = trip, and online + onSite = charged.
 */
export function settleBookingMoney(input: {
  rentalEur: number;
  extrasEur: number;
  deliveryEur: number;
  depositPercent?: number;
}): SettledBookingMoney {
  const rental = Math.max(0, moneyToCents(input.rentalEur));
  const extras = Math.max(0, moneyToCents(input.extrasEur));
  const delivery = Math.max(0, moneyToCents(input.deliveryEur));
  const trip = rental + extras + delivery;
  const commissionable = rental + extras;
  const fee = computeSiteServiceFee({
    commissionableEur: centsToMoney(commissionable),
    depositPercent: input.depositPercent,
  });
  const site = moneyToCents(fee.payNowBase);
  const card = moneyToCents(fee.cardSurcharge);
  const online = site + card;
  const onSite = trip - site;
  const charged = trip + card;
  if (
    site + onSite !== trip ||
    site + card !== online ||
    online + onSite !== charged ||
    trip + card !== charged
  ) {
    throw new Error("Booking money invariant failed");
  }
  return {
    rentalEur: centsToMoney(rental),
    extrasEur: centsToMoney(extras),
    deliveryEur: centsToMoney(delivery),
    tripEur: centsToMoney(trip),
    commissionableEur: centsToMoney(commissionable),
    depositPercent: fee.depositPercent,
    siteFeeEur: centsToMoney(site),
    cardSurchargeEur: centsToMoney(card),
    cardSurchargePercent: CARD_PICKUP_SURCHARGE_PERCENT,
    onlineEur: centsToMoney(online),
    onSiteEur: centsToMoney(onSite),
    chargedEur: centsToMoney(charged),
  };
}

/** Values written on a booking. charged = trip + card, and online + on-site = charged. */
export function persistedBookingCharge(input: {
  rentalEur: number;
  extrasEur: number;
  deliveryEur: number;
  depositPercent?: number;
}): {
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  settled: SettledBookingMoney;
} {
  const settled = settleBookingMoney(input);
  return {
    totalPriceEur: settled.chargedEur,
    depositPaidEur: settled.onlineEur,
    balanceDueEur: settled.onSiteEur,
    settled,
  };
}

/**
 * Trip total and the amount collected at pick-up, from the stored charges.
 * Online payment includes the card surcharge, so the trip is on-site plus the site fee.
 */
export function storedTripAndPickupDue(input: {
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur?: number | null;
}): { tripEur: number; dueAtPickupEur: number } {
  const charged = Math.max(0, moneyToCents(input.totalPriceEur));
  const online = Math.max(0, moneyToCents(input.depositPaidEur));
  const hasStoredDue =
    input.balanceDueEur != null && Number.isFinite(Number(input.balanceDueEur));
  const storedDue = hasStoredDue
    ? Math.max(0, moneyToCents(Number(input.balanceDueEur)))
    : Math.max(0, charged - online);
  if (online <= 2) {
    return {
      tripEur: centsToMoney(charged),
      dueAtPickupEur: centsToMoney(storedDue > 0 ? storedDue : charged),
    };
  }
  const site = moneyToCents(
    roundMoney(centsToMoney(online) / (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100)),
  );
  return {
    tripEur: centsToMoney(storedDue + site),
    dueAtPickupEur: centsToMoney(storedDue),
  };
}

/**
 * Display amounts for every booking surface (list, calendar, guest, admin).
 * Invariant: totalEur = paidEur + dueAtPickupEur (card surcharge stays inside paid).
 */
export function displayBookingCharges(input: {
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur?: number | null;
}): {
  totalEur: number;
  paidEur: number;
  dueAtPickupEur: number;
  tripEur: number;
  siteFeeEur: number;
  cardSurchargeEur: number;
} {
  const paidEur = roundMoney(Math.max(0, Number(input.depositPaidEur) || 0));
  const facing = storedTripAndPickupDue(input);
  const dueAtPickupEur = facing.dueAtPickupEur;
  const tripEur = facing.tripEur;
  const siteFeeEur =
    paidEur <= 0.02
      ? 0
      : roundMoney(paidEur / (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100));
  const cardSurchargeEur = roundMoney(Math.max(0, paidEur - siteFeeEur));
  const reconciled = roundMoney(paidEur + dueAtPickupEur);
  const storedCharged = roundMoney(Math.max(0, Number(input.totalPriceEur) || 0));
  const totalEur =
    storedCharged > 0.02 && Math.abs(storedCharged - reconciled) <= 0.05
      ? storedCharged
      : reconciled;
  return {
    totalEur,
    paidEur,
    dueAtPickupEur,
    tripEur,
    siteFeeEur,
    cardSurchargeEur,
  };
}
