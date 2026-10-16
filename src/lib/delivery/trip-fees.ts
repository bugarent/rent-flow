import {
  effectiveOneWayDeliveryPrice,
  hasDeliveryPriceLimit,
  type PartnerDeliveryInput,
} from "@/lib/delivery/pricing";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
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
    maxDeliveryPriceEur?: unknown;
    airport?: { iata?: string; city?: { name?: unknown; country?: { iso2?: string } } } | null;
  } | null;
};

/** Partner price never exceeds the admin limit of the location (limit 0 = no limit). */
function withinAdminLimit<T extends DeliveryPriceRowLike>(row: T): T {
  const rawMax = row.deliveryLocation?.maxDeliveryPriceEur;
  if (!hasDeliveryPriceLimit(rawMax)) return row;
  const max = toNumber(rawMax, 0);
  if (toNumber(row.priceEur, 0) <= max) return row;
  return { ...row, priceEur: max };
}

/** City delivery places by location id (only attached when the listing selected them). */
export type CityDeliveryPlace = {
  id: string;
  code: string;
  countryIso2: string;
  isActive: boolean;
  maxDeliveryPriceEur: number;
};

/**
 * A saved city delivery price is copied onto listings that explicitly list that
 * city. A city without a saved price is not added for free.
 */
function cityRowsFromPrefs(
  rows: DeliveryPriceRowLike[],
  prefs: PartnerDeliveryPref[],
  cityPlaces: ReadonlyMap<string, CityDeliveryPlace>,
  listingPlaceIds?: ReadonlySet<string>,
): DeliveryPriceRowLike[] {
  const present = new Set(rows.map((r) => String(r.deliveryLocationId || r.deliveryLocation?.id || "")));
  const extra: DeliveryPriceRowLike[] = [];
  const add = (
    place: CityDeliveryPlace,
    values: Pick<PartnerDeliveryPref, "priceEur" | "freeAfterDays" | "travelTimeMinutes">,
  ) => {
    present.add(place.id);
    extra.push({
      deliveryLocationId: place.id,
      priceEur: values.priceEur,
      freeAfterDays: values.freeAfterDays,
      travelTimeMinutes: values.travelTimeMinutes,
      deliveryLocation: {
        id: place.id,
        isActive: true,
        maxDeliveryPriceEur: place.maxDeliveryPriceEur,
        airport: { iata: place.code, city: { country: { iso2: place.countryIso2.toUpperCase() } } },
      },
    });
  };
  for (const pref of prefs) {
    if (pref.enabled === false || present.has(pref.deliveryLocationId)) continue;
    const place = cityPlaces.get(pref.deliveryLocationId);
    if (!place || !place.isActive) continue;
    // Only attach a city when the listing explicitly selected it — never borrow
    // every city in the same country from a single airport assignment.
    if (!listingPlaceIds?.has(place.id)) continue;
    add(place, pref);
  }
  return extra;
}

/** Overlay partner Delivery-page prefs onto a car's delivery price rows. */
export function mergeDeliveryPrefsIntoRows<T extends DeliveryPriceRowLike>(
  rows: T[] | undefined,
  prefs: PartnerDeliveryPref[] | undefined,
  cityPlaces?: ReadonlyMap<string, CityDeliveryPlace>,
  /** Location ids on the listing's own pick-up list. */
  listingPlaceIds?: ReadonlySet<string>,
): T[] {
  const byId = new Map((prefs ?? []).map((p) => [p.deliveryLocationId, p]));
  const merged = (rows ?? []).map((row) => {
    const locId = String(row.deliveryLocationId || row.deliveryLocation?.id || "");
    const pref = locId ? byId.get(locId) : undefined;
    if (!pref || pref.enabled === false) return withinAdminLimit(row);
    return withinAdminLimit({
      ...row,
      priceEur: pref.priceEur,
      freeAfterDays: pref.freeAfterDays,
      travelTimeMinutes: pref.travelTimeMinutes,
    });
  });
  if (!cityPlaces?.size || (!prefs?.length && !listingPlaceIds?.size)) return merged;
  const cityRows = cityRowsFromPrefs(merged, prefs ?? [], cityPlaces, listingPlaceIds).map(
    (row) => withinAdminLimit(row) as unknown as T,
  );
  return [...merged, ...cityRows];
}

/** Fee rows for this exact place. Another city or airport in the same country does not count. */
export function matchDeliveryRowsForPlace(
  rows: DeliveryPriceRowLike[] | undefined,
  placeCode: string | undefined,
): DeliveryPriceRowLike[] {
  if (!placeCode || !rows?.length) return [];
  const code = normalizeLocationCode(placeCode).toUpperCase();
  return rows.filter((row) => {
    if (!row.deliveryLocation?.airport || row.deliveryLocation.isActive === false) return false;
    const iata = normalizeLocationCode(row.deliveryLocation.airport.iata || "").toUpperCase();
    const id = normalizeLocationCode(row.deliveryLocationId || row.deliveryLocation.id || "").toUpperCase();
    return iata === code || id === code;
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
