import {
  effectiveOneWayDeliveryPrice,
  type PartnerDeliveryInput,
} from "@/lib/delivery/pricing";
import { isCityLocationCode, parseCityLocationCode } from "@/lib/catalog/search-places";
import { toNumber } from "@/lib/utils";
import type { PartnerDeliveryPref } from "@/lib/server/partner-delivery-prefs-store";

export type DeliveryPriceRowLike = {
  priceEur?: unknown;
  freeAfterDays?: unknown;
  travelTimeMinutes?: unknown;
  deliveryLocationId?: string;
  deliveryLocation?: {
    id?: string;
    isActive?: boolean;
    airport?: { iata?: string; city?: { country?: { iso2?: string } } } | null;
  } | null;
};

/** Overlay partner Delivery-page prefs onto a car's delivery price rows. */
export function mergeDeliveryPrefsIntoRows<T extends DeliveryPriceRowLike>(
  rows: T[] | undefined,
  prefs: PartnerDeliveryPref[] | undefined,
): T[] {
  if (!rows?.length) return [];
  if (!prefs?.length) return rows;
  const byId = new Map(prefs.map((p) => [p.deliveryLocationId, p]));
  return rows.map((row) => {
    const locId = String(row.deliveryLocationId || row.deliveryLocation?.id || "");
    const pref = locId ? byId.get(locId) : undefined;
    if (!pref || pref.enabled === false) return row;
    return {
      ...row,
      priceEur: pref.priceEur,
      freeAfterDays: pref.freeAfterDays,
      travelTimeMinutes: pref.travelTimeMinutes,
    };
  });
}

export function matchDeliveryRowsForPlace(
  rows: DeliveryPriceRowLike[] | undefined,
  placeCode: string | undefined,
): DeliveryPriceRowLike[] {
  if (!placeCode || !rows?.length) return [];
  const code = placeCode.toUpperCase();
  const cityIso2 = isCityLocationCode(placeCode)
    ? parseCityLocationCode(placeCode)?.iso2?.toUpperCase()
    : null;
  return rows.filter((row) => {
    const loc = row.deliveryLocation;
    if (!loc?.airport) return false;
    if (loc.isActive === false) return false;
    if (cityIso2) return loc.airport.city?.country?.iso2?.toUpperCase() === cityIso2;
    return loc.airport.iata?.toUpperCase() === code;
  });
}

function legFeeFromRows(rows: DeliveryPriceRowLike[], rentalDays: number): number {
  if (!rows.length) return 0;
  const fees = rows.map((row) =>
    effectiveOneWayDeliveryPrice(
      toNumber(row.priceEur, 0),
      row.freeAfterDays == null ? null : toNumber(row.freeAfterDays, 0),
      rentalDays,
    ),
  );
  return Math.min(...fees);
}

/**
 * Pickup + return one-way fees.
 * Each leg uses the partner's one-way price for that location independently —
 * same pickup and return still charge both legs (e.g. Batumi 70 + Batumi 70 = 140).
 */
export function computeTripDeliveryFees(input: {
  rows: DeliveryPriceRowLike[] | undefined;
  pickup: string | undefined;
  dropoff: string | undefined;
  rentalDays: number;
}): { pickupFeeEur: number; dropoffFeeEur: number; totalFeeEur: number } {
  const days = Math.max(1, input.rentalDays || 1);
  const pickupRows = matchDeliveryRowsForPlace(input.rows, input.pickup);
  const dropoffCode = (input.dropoff || input.pickup || "").trim();

  const pickupFeeEur = legFeeFromRows(pickupRows, days);
  if (!dropoffCode) {
    return { pickupFeeEur, dropoffFeeEur: 0, totalFeeEur: pickupFeeEur };
  }
  const dropoffRows = matchDeliveryRowsForPlace(input.rows, dropoffCode);
  const dropoffFeeEur = legFeeFromRows(dropoffRows, days);
  return {
    pickupFeeEur,
    dropoffFeeEur,
    totalFeeEur: pickupFeeEur + dropoffFeeEur,
  };
}

export function prefsToDeliveryInputs(prefs: PartnerDeliveryPref[]): PartnerDeliveryInput[] {
  return prefs
    .filter((p) => p.enabled !== false)
    .map((p) => ({
      deliveryLocationId: p.deliveryLocationId,
      enabled: true,
      priceEur: p.priceEur,
      freeAfterDays: p.freeAfterDays,
      travelTimeMinutes: p.travelTimeMinutes,
    }));
}
