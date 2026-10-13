import "server-only";

import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";

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

/**
 * Places customers may search: an approved partner added the place in personal
 * info. A delivery-window save does not add a place on its own.
 */
export async function bookablePlaceKeys(locations: DeliveryLocationView[]): Promise<Set<string>> {
  const { approvedPartnerPlaceGroups } = await import("@/lib/server/partner-search-coverage");
  const groups = await approvedPartnerPlaceGroups();
  const expand = placeKeyExpander(locations);
  const bookable = new Set<string>();
  for (const group of groups) {
    for (const key of group.codes.flatMap(expand)) bookable.add(key);
  }
  return bookable;
}
