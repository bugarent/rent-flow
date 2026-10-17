import "server-only";

import { publicListingStatusWhere, publicPartnerWhere } from "@/lib/cars/listing-visibility";
import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { prisma } from "@/lib/prisma";

function partnerKey(raw: string | null | undefined) {
  return String(raw || "").trim().replace(/^file-partner-/, "");
}

function partnerAliases(partnerId: string) {
  const bare = partnerKey(partnerId);
  return [...new Set([partnerId.trim(), bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
}

/** Every key a place can be referenced by: location id, IATA / city code, airport id. */
function placeKeyExpander(locations: DeliveryLocationView[]) {
  const byKey = new Map<string, DeliveryLocationView>();
  for (const loc of locations) {
    for (const value of [loc.id, loc.iata, loc.airportId]) {
      const key = normalizeLocationCode(value || "").toUpperCase();
      if (key && !byKey.has(key)) byKey.set(key, loc);
    }
  }
  return (raw: string | null | undefined): string[] => {
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
  };
}

/** Customer-visible listings per partner (database and file listings). */
async function liveListingCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  const add = (partnerId: string) => {
    const key = partnerKey(partnerId);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  try {
    const rows = await prisma.car.findMany({
      where: { ...publicListingStatusWhere, partner: publicPartnerWhere },
      select: { id: true, partnerId: true },
    });
    for (const row of rows) {
      seen.add(row.id);
      add(row.partnerId);
    }
  } catch {
    /* file listings below */
  }
  try {
    const { isPublicFileCar, listFileCars } = await import("@/lib/server/partner-cars-store");
    for (const car of await listFileCars()) {
      if (isPublicFileCar(car) && !seen.has(car.id)) add(car.partnerId);
    }
  } catch {
    /* ignore */
  }
  return counts;
}

/**
 * Live cars customers can get at each place key. Listings follow the partner's
 * Delivery page, so every live car of an approved partner counts at each place the
 * partner switched ON there (and has in their cabinet places).
 */
export async function bookablePlaceCarCounts(locations: DeliveryLocationView[]): Promise<Map<string, number>> {
  const { approvedPartnerPlaceGroups } = await import("@/lib/server/partner-search-coverage");
  const { readPartnerDeliveryPrefsMap } = await import("@/lib/server/partner-delivery-prefs-store");
  const [groups, live] = await Promise.all([approvedPartnerPlaceGroups(), liveListingCounts()]);
  const withCars = groups.filter((group) => (live.get(partnerKey(group.partnerId)) ?? 0) > 0);
  const counts = new Map<string, number>();
  if (!withCars.length) return counts;

  const prefsByPartner = await readPartnerDeliveryPrefsMap(
    withCars.flatMap((group) => partnerAliases(group.partnerId)),
  ).catch(() => new Map<string, Array<{ deliveryLocationId: string; enabled: boolean }>>());
  const expand = placeKeyExpander(locations);

  for (const group of withCars) {
    const cars = live.get(partnerKey(group.partnerId)) ?? 0;
    const prefs =
      partnerAliases(group.partnerId)
        .map((id) => prefsByPartner.get(id))
        .find((list) => list?.length) ?? [];
    const listed = new Set(group.codes.flatMap(expand));
    const offered = new Set<string>();
    for (const pref of prefs) {
      if (pref.enabled === false) continue;
      const keys = expand(pref.deliveryLocationId);
      if (keys.some((key) => listed.has(key))) for (const key of keys) offered.add(key);
    }
    for (const key of offered) counts.set(key, (counts.get(key) ?? 0) + cars);
  }
  return counts;
}

/** Keys of places customers may search: at least one live car is offered there. */
export async function bookablePlaceKeys(locations: DeliveryLocationView[]): Promise<Set<string>> {
  const counts = await bookablePlaceCarCounts(locations);
  return new Set([...counts].filter(([, cars]) => cars > 0).map(([key]) => key));
}
