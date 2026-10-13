import "server-only";

import { listingPickupPlaceIds } from "@/lib/cars/listing-place-ids";
import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import { capFreeAfterDays, normalizeDeliveryPrice, type DeliveryLocationView } from "@/lib/delivery/pricing";
import type { DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { approvedPartnerPlaceGroups } from "@/lib/server/partner-search-coverage";
import type { PartnerDeliveryPref } from "@/lib/server/partner-delivery-prefs-store";

function partnerKey(raw: string | null | undefined) {
  return String(raw || "").trim().replace(/^file-partner-/, "");
}

export type SearchCabinet = {
  byPartner: Map<string, Set<string>>;
  byKey: Map<string, DeliveryLocationView>;
};

function indexLocations(locations: DeliveryLocationView[]) {
  const byKey = new Map<string, DeliveryLocationView>();
  for (const loc of locations) {
    for (const value of [loc.id, loc.iata, loc.airportId]) {
      const key = normalizeLocationCode(value || "").toUpperCase();
      if (key && !byKey.has(key)) byKey.set(key, loc);
    }
  }
  return byKey;
}

export function expandPlaceKeys(raw: string | null | undefined, byKey: Map<string, DeliveryLocationView>): string[] {
  const keys = new Set<string>();
  const norm = normalizeLocationCode(raw || "").toUpperCase();
  if (!norm) return [];
  keys.add(norm);
  const place = findSearchPlace(norm);
  if (place?.code) keys.add(normalizeLocationCode(place.code).toUpperCase());
  for (const key of [...keys]) {
    const loc = byKey.get(key);
    if (!loc) continue;
    for (const value of [loc.id, loc.iata, loc.airportId]) {
      const k = normalizeLocationCode(value || "").toUpperCase();
      if (k) keys.add(k);
    }
  }
  return [...keys];
}

/** Personal-info places for every approved partner, including people approved later. */
export async function loadSearchCabinet(): Promise<SearchCabinet> {
  const [groups, locations] = await Promise.all([
    approvedPartnerPlaceGroups(),
    listDeliveryLocations({ activeOnly: false }),
  ]);
  const byKey = indexLocations(locations);
  const byPartner = new Map<string, Set<string>>();
  for (const group of groups) {
    const keys = new Set(group.codes.flatMap((code) => expandPlaceKeys(code, byKey)));
    if (!keys.size) continue;
    const bare = partnerKey(group.partnerId);
    for (const id of new Set([bare, group.partnerId.trim(), bare ? `file-partner-${bare}` : ""])) {
      if (!id) continue;
      const set = byPartner.get(id) ?? new Set<string>();
      for (const key of keys) set.add(key);
      byPartner.set(id, set);
    }
  }
  return { byPartner, byKey };
}

export function partnerIdsForPlace(cabinet: SearchCabinet, placeCode: string): string[] {
  const wanted = new Set(expandPlaceKeys(placeCode, cabinet.byKey));
  if (!wanted.size) return [];
  const ids = new Set<string>();
  for (const [partnerId, keys] of cabinet.byPartner) {
    if (![...wanted].some((key) => keys.has(key))) continue;
    const bare = partnerKey(partnerId);
    if (bare) ids.add(bare);
  }
  return [...ids];
}

function allowedFor(cabinet: SearchCabinet, partnerId: string): Set<string> {
  const bare = partnerKey(partnerId);
  return (
    cabinet.byPartner.get(partnerId) ||
    cabinet.byPartner.get(bare) ||
    cabinet.byPartner.get(`file-partner-${bare}`) ||
    new Set()
  );
}

function placeAllowed(cabinet: SearchCabinet, allowed: Set<string>, placeCode: string) {
  return expandPlaceKeys(placeCode, cabinet.byKey).some((key) => allowed.has(key));
}

function rowKeys(row: DeliveryPriceRowLike, cabinet: SearchCabinet) {
  return [row.deliveryLocationId, row.deliveryLocation?.id, row.deliveryLocation?.airport?.iata].flatMap((value) =>
    expandPlaceKeys(String(value || ""), cabinet.byKey),
  );
}

function locationFor(cabinet: SearchCabinet, raw: string) {
  for (const key of expandPlaceKeys(raw, cabinet.byKey)) {
    const loc = cabinet.byKey.get(key);
    if (loc) return loc;
  }
  return undefined;
}

function prefsFor(map: Map<string, PartnerDeliveryPref[]> | undefined, partnerId: string) {
  if (!map) return [];
  const bare = partnerKey(partnerId);
  return map.get(partnerId) || map.get(bare) || map.get(`file-partner-${bare}`) || [];
}

/** Saved delivery price for a personal-info place, even when the listing itself has no row yet. */
function ensurePrefRows(
  rows: DeliveryPriceRowLike[],
  prefs: PartnerDeliveryPref[],
  cabinet: SearchCabinet,
  allowed: Set<string>,
) {
  const present = new Set(rows.flatMap((row) => rowKeys(row, cabinet)));
  const extra: DeliveryPriceRowLike[] = [];
  for (const pref of prefs) {
    if (pref.enabled === false) continue;
    const keys = expandPlaceKeys(pref.deliveryLocationId, cabinet.byKey);
    if (!keys.some((key) => allowed.has(key)) || keys.some((key) => present.has(key))) continue;
    const loc = locationFor(cabinet, pref.deliveryLocationId);
    if (!loc || loc.isActive === false) continue;
    for (const key of keys) present.add(key);
    extra.push({
      deliveryLocationId: loc.id,
      priceEur: normalizeDeliveryPrice(loc.maxDeliveryPriceEur, pref.priceEur).priceEur,
      freeAfterDays: capFreeAfterDays(loc.maxFreeAfterDays, pref.freeAfterDays).freeAfterDays,
      travelTimeMinutes: pref.travelTimeMinutes,
      deliveryLocation: {
        id: loc.id,
        isActive: true,
        maxDeliveryPriceEur: loc.maxDeliveryPriceEur,
        airport: { iata: loc.iata, city: { country: { iso2: loc.countryIso2 } } },
      },
    });
  }
  return extra.length ? [...rows, ...extra] : rows;
}

function servesCountry(cabinet: SearchCabinet, allowed: Set<string>, iso2: string) {
  for (const key of allowed) {
    const loc = cabinet.byKey.get(key);
    if (loc?.countryIso2?.toUpperCase() === iso2) return true;
    if (findSearchPlace(key)?.countryIso2 === iso2) return true;
  }
  return false;
}

type ScopedCar = {
  id?: string;
  partnerId?: string;
  partner?: { id?: string };
  description?: string | null;
  deliveryPrices?: DeliveryPriceRowLike[];
};

/** Place ids a listing itself offers: checked pickup places and its own delivery rows. */
export function listingOfferedPlaceIds(car: {
  description?: string | null;
  deliveryPrices?: DeliveryPriceRowLike[];
}): string[] {
  return [
    ...listingPickupPlaceIds(car.description),
    ...(car.deliveryPrices || []).flatMap((row) => [
      String(row.deliveryLocationId || row.deliveryLocation?.id || ""),
      String(row.deliveryLocation?.airport?.iata || ""),
    ]),
  ].filter(Boolean);
}

function offeredPlaces(cabinet: SearchCabinet, personal: Set<string>, rawIds: string[]) {
  const out = new Set<string>();
  for (const raw of rawIds) {
    const keys = expandPlaceKeys(raw, cabinet.byKey);
    if (!keys.some((key) => personal.has(key))) continue;
    for (const key of keys) out.add(key);
  }
  return out;
}

/** Offered places that also have an enabled price saved on the partner's Delivery page (0 = free). */
function pricedPlaces(cabinet: SearchCabinet, offered: Set<string>, prefs: PartnerDeliveryPref[]) {
  const out = new Set<string>();
  for (const pref of prefs) {
    if (pref.enabled === false) continue;
    const loc = locationFor(cabinet, pref.deliveryLocationId);
    if (!loc || loc.isActive === false) continue;
    const keys = expandPlaceKeys(pref.deliveryLocationId, cabinet.byKey);
    if (!keys.some((key) => offered.has(key))) continue;
    for (const key of keys) out.add(key);
  }
  return out;
}

/**
 * A listing is shown at a place only when all three hold for that exact place:
 * it is in the partner's personal info, it is checked on the listing itself, and
 * the partner saved a delivery price for it on the Delivery page. A city never
 * borrows an airport or another place in the same country.
 * The saved delivery price for such a place is attached so the quote includes it.
 */
export function scopeCarsToPersonalPlaces<T extends ScopedCar>(
  cars: T[],
  cabinet: SearchCabinet,
  opts: {
    pickup?: string;
    dropoff?: string;
    countryIso2?: string;
    prefsByPartner?: Map<string, PartnerDeliveryPref[]>;
    /** Listing's own place ids, read before delivery prefs are merged in. */
    listingPlacesByCar: Map<string, string[]>;
  },
): { cars: T[]; rejected: Array<{ id: string; reason: string }> } {
  const pickup = opts.pickup?.trim() || "";
  const dropoff = opts.dropoff?.trim() || "";
  const country = (opts.countryIso2 || "").trim().toUpperCase();
  const dropoffDiffers = Boolean(dropoff && normalizeLocationCode(dropoff) !== normalizeLocationCode(pickup || dropoff));
  const kept: T[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];

  for (const car of cars) {
    const id = String(car.id || "");
    const pid = String(car.partnerId || car.partner?.id || "");
    const personal = allowedFor(cabinet, pid);
    if (!personal.size) {
      rejected.push({ id, reason: "partner has no places in personal info" });
      continue;
    }
    const offered = offeredPlaces(cabinet, personal, opts.listingPlacesByCar.get(id) || []);
    if (!offered.size) {
      rejected.push({ id, reason: "listing has no checked pickup place from personal info" });
      continue;
    }
    const prefs = prefsFor(opts.prefsByPartner, pid);
    const allowed = pricedPlaces(cabinet, offered, prefs);
    const legs = [
      ...(pickup ? [{ code: pickup, label: "" }] : []),
      ...(dropoffDiffers ? [{ code: dropoff, label: "return " }] : []),
    ];
    const failure = legs
      .map(({ code, label }) => {
        if (!placeAllowed(cabinet, personal, code)) return `personal info does not include ${label}${code}`;
        if (!placeAllowed(cabinet, offered, code)) return `listing is not offered for ${label}${code}`;
        if (!placeAllowed(cabinet, allowed, code)) return `no delivery price saved for ${label}${code}`;
        return "";
      })
      .find(Boolean);
    if (failure) {
      rejected.push({ id, reason: failure });
      continue;
    }
    if (!allowed.size) {
      rejected.push({ id, reason: "no delivery price saved for any of the listing's places" });
      continue;
    }
    if (country && !servesCountry(cabinet, allowed, country)) {
      rejected.push({ id, reason: `no priced place in ${country}` });
      continue;
    }
    const rows = ensurePrefRows(car.deliveryPrices || [], prefs, cabinet, allowed).filter(
      (row) => row.deliveryLocation?.isActive !== false && rowKeys(row, cabinet).some((key) => allowed.has(key)),
    );
    kept.push({ ...car, deliveryPrices: rows as T["deliveryPrices"] });
  }
  return { cars: kept, rejected };
}
