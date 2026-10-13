import "server-only";

import { parseCarDetails } from "@/lib/cars/car-details";
import { publicListingStatusWhere, publicPartnerWhere } from "@/lib/cars/listing-visibility";
import {
  findSearchPlace,
  normalizeLocationCode,
  searchPlacesForCountry,
} from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { prisma } from "@/lib/prisma";

function partnerKey(raw: string | null | undefined) {
  return String(raw || "").trim().replace(/^file-partner-/, "");
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

type StoredPickupPlace = { deliveryLocationId?: unknown; placeLabel?: unknown; cityKey?: unknown };

/** Catalog code for a saved pick-up row, so a recreated location row does not break the link. */
function catalogCodeForPickup(place: StoredPickupPlace): string {
  const iso2 = String(place.cityKey || "").split("::")[0]?.trim().toUpperCase();
  const label = String(place.placeLabel || "").trim().toLowerCase();
  if (!iso2 || iso2.length !== 2 || !label) return "";
  return searchPlacesForCountry(iso2).find((p) => p.label.toLowerCase() === label)?.code || "";
}

/** One entry per pick-up point: its location id plus its catalog code. */
function pickupPlaceRefs(description: string | null | undefined): string[][] {
  const places = parseCarDetails(description)?.pickupPlaces;
  if (!Array.isArray(places)) return [];
  return places.flatMap((place) => {
    if (!place || typeof place !== "object") return [];
    const row = place as StoredPickupPlace;
    const refs = [String(row.deliveryLocationId || ""), catalogCodeForPickup(row)].filter(Boolean);
    return refs.length ? [refs] : [];
  });
}

/** Pick-up points on each partner's customer-visible listings (airport rows + city pickups). */
async function livePickupRefsByPartner(): Promise<Map<string, string[][]>> {
  const refs = new Map<string, string[][]>();
  const add = (partnerId: string, points: Array<Array<string | null | undefined>>) => {
    const key = partnerKey(partnerId);
    if (!key) return;
    const list = refs.get(key) ?? [];
    for (const point of points) {
      const values = point.filter((value): value is string => Boolean(value));
      if (values.length) list.push(values);
    }
    refs.set(key, list);
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
      add(car.partnerId, [
        ...car.deliveryPrices.map((row) => [row.deliveryLocationId, row.deliveryLocation?.airport?.iata]),
        ...pickupPlaceRefs(car.description),
      ]);
    }
  } catch {
    /* file listings below */
  }

  try {
    const { isPublicFileCar, listFileCars } = await import("@/lib/server/partner-cars-store");
    for (const car of await listFileCars()) {
      if (!isPublicFileCar(car)) continue;
      add(car.partnerId, [
        ...(car.deliveryPrices || []).map((row) => [row.deliveryLocationId]),
        ...pickupPlaceRefs(car.description),
      ]);
    }
  } catch {
    /* ignore */
  }

  return refs;
}

/**
 * Keys of places customers may search: an approved partner has the place in their
 * cabinet AND at least one of that same partner's live listings delivers there.
 */
export async function bookablePlaceKeys(locations: DeliveryLocationView[]): Promise<Set<string>> {
  const { approvedPartnerPlaceGroups } = await import("@/lib/server/partner-search-coverage");
  const [groups, carRefs] = await Promise.all([approvedPartnerPlaceGroups(), livePickupRefsByPartner()]);
  const expand = placeKeyExpander(locations);
  const bookable = new Set<string>();

  for (const group of groups) {
    const points = carRefs.get(partnerKey(group.partnerId));
    if (!points?.length) continue;
    const listed = new Set(group.codes.flatMap(expand));
    for (const point of points) {
      const keys = point.flatMap(expand);
      if (keys.some((key) => listed.has(key))) for (const key of keys) bookable.add(key);
    }
  }
  return bookable;
}
