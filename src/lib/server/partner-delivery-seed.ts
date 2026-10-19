import "server-only";

import { searchPlacesForCountry } from "@/lib/catalog/search-places";
import { capFreeAfterDays, normalizeDeliveryPrice, type DeliveryLocationView } from "@/lib/delivery/pricing";
import {
  addMissingPartnerDeliveryPrefs,
  readPartnerDeliveryPrefs,
} from "@/lib/server/partner-delivery-prefs-store";

/**
 * Runs when the partner uploads a car listing: an operating country with no
 * Delivery-page place yet (none ON, none switched OFF) gets all its airports ON at
 * price 0. The partner then switches places off or adds more on the Delivery page;
 * a country the partner already touched is never changed.
 */
export async function seedAirportsForUntouchedCountries(partnerId: string): Promise<number> {
  if (!partnerId) return 0;
  const {
    ensureDeliveryLocationByCode,
    listDeliveryLocations,
    readPartnerDeliverySettings,
    syncPartnerEnabledDeliveryLocationIds,
  } = await import("@/lib/server/delivery-locations");

  const [settings, prefs, all] = await Promise.all([
    readPartnerDeliverySettings(partnerId),
    readPartnerDeliveryPrefs(partnerId),
    listDeliveryLocations({ activeOnly: false }),
  ]);
  if (!settings.deliveryCountryIso2s.length) return 0;

  const byKey = new Map<string, DeliveryLocationView>();
  for (const loc of all) {
    for (const value of [loc.id, loc.iata, loc.airportId]) {
      const key = String(value || "").trim().toUpperCase();
      if (key && !byKey.has(key)) byKey.set(key, loc);
    }
  }
  const countryOf = (raw: string) => {
    const key = String(raw || "").trim().toUpperCase();
    return (byKey.get(key)?.countryIso2 || "").toUpperCase();
  };
  const touched = new Set(
    [...prefs.map((p) => p.deliveryLocationId), ...settings.deliveryLocationIds].map(countryOf).filter(Boolean),
  );

  const added: DeliveryLocationView[] = [];
  for (const iso of settings.deliveryCountryIso2s) {
    if (touched.has(iso)) continue;
    for (const place of searchPlacesForCountry(iso)) {
      if (place.kind !== "airport") continue;
      const loc = await ensureDeliveryLocationByCode(place.code, { isActive: false });
      if (loc && !added.some((row) => row.id === loc.id)) added.push(loc);
    }
  }
  if (!added.length) return 0;

  const stored = await addMissingPartnerDeliveryPrefs(
    partnerId,
    added.map((loc) => ({
      deliveryLocationId: loc.id,
      enabled: true,
      priceEur: normalizeDeliveryPrice(loc.maxDeliveryPriceEur, 0).priceEur,
      freeAfterDays: capFreeAfterDays(loc.maxFreeAfterDays, 0).freeAfterDays,
      travelTimeMinutes: 0,
    })),
  );
  if (stored) {
    await syncPartnerEnabledDeliveryLocationIds(partnerId, [
      ...settings.deliveryLocationIds,
      ...added.map((loc) => loc.id),
    ]);
  }
  return stored;
}
