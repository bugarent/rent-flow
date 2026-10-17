import "server-only";

import type { DeliveryPlace } from "@/lib/delivery/trip-fees";
import { createTtlCache } from "@/lib/server/ttl-cache";

const cache = createTtlCache<ReadonlyMap<string, DeliveryPlace>>(15_000);

/** Every delivery catalog place (airports and city delivery) by location id, for fee calculation. */
export async function loadDeliveryPlaces(): Promise<ReadonlyMap<string, DeliveryPlace>> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const all = await listDeliveryLocations({ activeOnly: false });
    const map = new Map<string, DeliveryPlace>();
    for (const loc of all) {
      const code = String(loc.iata || loc.airportId || "").trim();
      if (!code) continue;
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
    console.warn("[delivery-places] using last known list", error);
    return cache.peek() ?? new Map();
  }
}
