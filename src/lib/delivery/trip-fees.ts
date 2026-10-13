import {
  effectiveOneWayDeliveryPrice,
  hasDeliveryPriceLimit,
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

/** City delivery places by location id (city places are not stored on listings). */
export type CityDeliveryPlace = {
  id: string;
  code: string;
  countryIso2: string;
  isActive: boolean;
  maxDeliveryPriceEur: number;
};

function rowCountry(row: DeliveryPriceRowLike): string {
  return String(row.deliveryLocation?.airport?.city?.country?.iso2 || "").toUpperCase();
}

/**
 * The partner's "City delivery" price for a city applies to every listing the
 * partner offers in that country, so a city search charges that exact price.
 * Cities a listing marks itself count even when it has no airport row in that
 * country (e.g. a partner in a newly added country delivering only to cities);
 * without a Delivery-page price such a city is free.
 */
function cityRowsFromPrefs(
  rows: DeliveryPriceRowLike[],
  prefs: PartnerDeliveryPref[],
  cityPlaces: ReadonlyMap<string, CityDeliveryPlace>,
  listingPlaceIds?: ReadonlySet<string>,
): DeliveryPriceRowLike[] {
  const present = new Set(rows.map((r) => String(r.deliveryLocationId || r.deliveryLocation?.id || "")));
  const countries = new Set(
    rows.filter((r) => r.deliveryLocation?.isActive !== false).map(rowCountry).filter(Boolean),
  );
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
  const prefIds = new Set<string>();
  for (const pref of prefs) {
    prefIds.add(pref.deliveryLocationId);
    if (pref.enabled === false || present.has(pref.deliveryLocationId)) continue;
    const place = cityPlaces.get(pref.deliveryLocationId);
    if (!place || !place.isActive) continue;
    if (!countries.has(place.countryIso2.toUpperCase()) && !listingPlaceIds?.has(place.id)) continue;
    add(place, pref);
  }
  for (const id of listingPlaceIds ?? []) {
    if (present.has(id) || prefIds.has(id)) continue;
    const place = cityPlaces.get(id);
    if (!place?.isActive) continue;
    add(place, { priceEur: 0, freeAfterDays: null, travelTimeMinutes: 0 });
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

function cityNameSlug(name: unknown): string {
  const text =
    typeof name === "string"
      ? name
      : name && typeof name === "object" && "en" in name
        ? String((name as { en?: unknown }).en || "")
        : "";
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

export function matchDeliveryRowsForPlace(
  rows: DeliveryPriceRowLike[] | undefined,
  placeCode: string | undefined,
): DeliveryPriceRowLike[] {
  if (!placeCode || !rows?.length) return [];
  const code = placeCode.toUpperCase();
  const active = rows.filter((row) => row.deliveryLocation?.airport && row.deliveryLocation.isActive !== false);
  const exact = active.filter((row) => row.deliveryLocation?.airport?.iata?.toUpperCase() === code);
  const city = isCityLocationCode(placeCode) ? parseCityLocationCode(placeCode) : null;
  if (!city || exact.length) return exact;

  // No price for this city itself: use the airport in the same city, then the country.
  const inCountry = active.filter((row) => rowCountry(row) === city.iso2.toUpperCase());
  const sameCity = inCountry.filter((row) => {
    return cityNameSlug(row.deliveryLocation?.airport?.city?.name) === city.slug;
  });
  return sameCity.length ? sameCity : inCountry;
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
