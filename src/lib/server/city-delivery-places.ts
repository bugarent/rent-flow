import "server-only";

import { isCityLocationCode } from "@/lib/catalog/search-places";
import type { CityDeliveryPlace } from "@/lib/delivery/trip-fees";
import { createTtlCache } from "@/lib/server/ttl-cache";

const cache = createTtlCache<ReadonlyMap<string, CityDeliveryPlace>>(15_000);

/** City delivery places (e.g. "Tbilisi city delivery") by location id, for fee calculation. */
export async function loadCityDeliveryPlaces(): Promise<ReadonlyMap<string, CityDeliveryPlace>> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const all = await listDeliveryLocations({ activeOnly: false });
    const map = new Map<string, CityDeliveryPlace>();
    for (const loc of all) {
      const code = String(loc.iata || "").trim();
      if (!isCityLocationCode(code)) continue;
      map.set(loc.id, {
        id: loc.id,
        code: code.toUpperCase(),
        countryIso2: String(loc.countryIso2 || "").toUpperCase(),
        isActive: loc.isActive !== false,
        maxDeliveryPriceEur: Number(loc.maxDeliveryPriceEur) || 0,
      });
    }
    cache.set(map);
    return map;
  } catch (error) {
    console.warn("[city-delivery-places] using last known list", error);
    return cache.peek() ?? new Map();
  }
}
