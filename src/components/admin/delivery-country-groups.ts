import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isCityLocationCode } from "@/lib/catalog/search-places";
import { lookupDeliveryCount } from "@/lib/delivery/partner-counts";
import { COUNTRY_NAMES_KA } from "@/lib/catalog/country-names-ka";

export type DeliveryCountryGroup = {
  iso2: string;
  name: string;
  items: DeliveryLocationView[];
  airports: number;
  cities: number;
  /** Partner deliveries to this country's places. */
  deliveries: number;
};

export function isCityLocation(item: DeliveryLocationView) {
  if (item.kind === "city") return true;
  if (item.kind === "airport") return false;
  return isCityLocationCode(item.iata) || isCityLocationCode(item.airportId);
}

const SEARCH_LOCALES = ["en", "ka", "ru"] as const;

/** Country names in every admin language, so "სომხეთი", "Армения" and "Armenia" all match. */
function countrySearchText(iso2: string, name: string): string {
  const parts = [iso2, name, COUNTRY_NAMES_KA[iso2.toUpperCase()] ?? ""];
  for (const locale of SEARCH_LOCALES) {
    try {
      const localized = new Intl.DisplayNames([locale], { type: "region" }).of(iso2);
      if (localized) parts.push(localized);
    } catch {
      /* unsupported locale or code */
    }
  }
  return parts.join(" ").toLowerCase();
}

export function matchesCountryQuery(group: Pick<DeliveryCountryGroup, "iso2" | "name">, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return countrySearchText(group.iso2, group.name).includes(q);
}

/** One group per country, alphabetical; places inside sorted by label. */
export function groupDeliveryByCountry(
  items: DeliveryLocationView[],
  deliveryCounts: Record<string, number>,
): DeliveryCountryGroup[] {
  const map = new Map<string, DeliveryCountryGroup>();
  for (const item of items) {
    const iso2 = item.countryIso2.trim().toUpperCase() || "XX";
    let group = map.get(iso2);
    if (!group) {
      group = { iso2, name: item.country || iso2, items: [], airports: 0, cities: 0, deliveries: 0 };
      map.set(iso2, group);
    }
    group.items.push(item);
    if (isCityLocation(item)) group.cities += 1;
    else group.airports += 1;
    group.deliveries += lookupDeliveryCount(deliveryCounts, [item.iata, item.airportId, item.id]);
  }
  const groups = [...map.values()];
  for (const group of groups) {
    group.items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
