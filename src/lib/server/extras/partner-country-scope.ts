import "server-only";

import { extraAvailableIn, extraCountryScope } from "@/lib/extras/country-scope";

type ScopedService = Parameters<typeof extraCountryScope>[0];

/** Partner operating countries; partners without a saved country are Georgian (platform default). */
export async function partnerOperatingCountries(partnerId: string): Promise<string[]> {
  if (!partnerId) return ["GE"];
  try {
    const { readPartnerDeliverySettings } = await import("@/lib/server/delivery-locations");
    const { deliveryCountryIso2s } = await readPartnerDeliverySettings(partnerId);
    return deliveryCountryIso2s.length ? deliveryCountryIso2s : ["GE"];
  } catch {
    return ["GE"];
  }
}

/** Drops country-limited admin extras the partner cannot offer (e.g. Georgia-only routes). */
export async function scopeExtrasToPartner<T extends ScopedService>(
  services: T[],
  partnerId: string,
  countries?: string[],
): Promise<T[]> {
  if (!services.some((service) => extraCountryScope(service).length > 0)) return services;
  const operating = countries?.length ? countries : await partnerOperatingCountries(partnerId);
  return services.filter((service) => extraAvailableIn(service, operating));
}
