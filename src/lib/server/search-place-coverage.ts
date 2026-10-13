import "server-only";

import { listingPickupPlaceIds } from "@/lib/cars/listing-place-ids";
import { publicListingStatusWhere, publicPartnerWhere } from "@/lib/cars/listing-visibility";
import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { prisma } from "@/lib/prisma";

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

function partnerAliases(partnerId: string) {
  const bare = partnerId.trim().replace(/^file-partner-/, "");
  return [...new Set([partnerId.trim(), bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
}

function remember(map: Map<string, Set<string>>, partnerId: string, keys: Iterable<string>) {
  for (const id of partnerAliases(partnerId)) {
    const set = map.get(id) ?? new Set<string>();
    for (const key of keys) set.add(key);
    map.set(id, set);
  }
}

/**
 * Places a public listing offers as pickup. The delivery-price window does not
 * add a place; only the locations checked on the listing do.
 */
async function listingPlaceKeysByPartner(
  expand: (raw: string | null | undefined) => string[],
): Promise<Map<string, Set<string>>> {
  const byPartner = new Map<string, Set<string>>();
  const add = (partnerId: string, rawIds: Iterable<string>) => {
    const keys = new Set<string>();
    for (const raw of rawIds) {
      for (const key of expand(raw)) keys.add(key);
    }
    if (keys.size) remember(byPartner, partnerId, keys);
  };

  try {
    const cars = await prisma.car.findMany({
      where: { ...publicListingStatusWhere, partner: publicPartnerWhere },
      select: {
        partnerId: true,
        description: true,
        deliveryPrices: {
          select: {
            deliveryLocationId: true,
            deliveryLocation: { select: { airport: { select: { iata: true } } } },
          },
        },
      },
    });
    for (const car of cars) {
      const ids = [
        ...listingPickupPlaceIds(car.description),
        ...car.deliveryPrices.flatMap((row) => [row.deliveryLocationId, row.deliveryLocation?.airport?.iata || ""]),
      ];
      add(car.partnerId, ids);
    }
  } catch {
    /* file listings below can still mark a place */
  }

  try {
    const { isPublicFileCar, listFileCars } = await import("@/lib/server/partner-cars-store");
    const cars = await listFileCars();
    for (const car of cars) {
      if (!isPublicFileCar(car)) continue;
      const ids = [
        ...listingPickupPlaceIds(car.description),
        ...(car.deliveryPrices || []).map((row) => row.deliveryLocationId),
      ];
      add(car.partnerId, ids);
    }
  } catch {
    /* ignore */
  }

  return byPartner;
}

/**
 * Places customers may search. A country and its pickup points appear only where
 * an approved partner checked that exact place on a live car listing, and the
 * same place is in their personal info. Saving a delivery price, or adding the
 * airport in personal info alone, does not add the country.
 */
export async function bookablePlaceKeys(locations: DeliveryLocationView[]): Promise<Set<string>> {
  const { approvedPartnerPlaceGroups } = await import("@/lib/server/partner-search-coverage");
  const groups = await approvedPartnerPlaceGroups();
  const expand = placeKeyExpander(locations);
  const cabinet = new Map<string, Set<string>>();
  for (const group of groups) {
    const keys = group.codes.flatMap(expand);
    if (keys.length) remember(cabinet, group.partnerId, keys);
  }

  const offered = await listingPlaceKeysByPartner(expand);
  const bookable = new Set<string>();
  for (const [partnerId, placeKeys] of offered) {
    const allowed =
      cabinet.get(partnerId) ||
      cabinet.get(partnerId.replace(/^file-partner-/, "")) ||
      cabinet.get(`file-partner-${partnerId.replace(/^file-partner-/, "")}`);
    if (!allowed?.size) continue;
    for (const key of placeKeys) {
      if (allowed.has(key)) bookable.add(key);
    }
  }
  return bookable;
}
