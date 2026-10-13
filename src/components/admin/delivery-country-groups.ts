import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isCityLocationCode, normalizeLocationCode } from "@/lib/catalog/search-places";
import { COUNTRY_NAMES_KA } from "@/lib/catalog/country-names-ka";

export type DeliveryCountryGroup = {
  iso2: string;
  name: string;
  items: DeliveryLocationView[];
  airports: number;
  cities: number;
  /** Airports where at least one partner listing is marked for delivery. */
  activeAirports: number;
  /** Cities where at least one partner listing is marked for delivery. */
  activeCities: number;
};

export function isCityLocation(item: DeliveryLocationView) {
  if (item.kind === "city") return true;
  if (item.kind === "airport") return false;
  return isCityLocationCode(item.iata) || isCityLocationCode(item.airportId);
}

/** `deliverableKeys` holds upper-case location codes / ids from the server. */
export function hasListingDelivery(item: DeliveryLocationView, deliverableKeys: ReadonlySet<string>) {
  return [item.iata, item.airportId, item.id].some((raw) => {
    const key = normalizeLocationCode(raw || "").toUpperCase();
    return Boolean(key && deliverableKeys.has(key));
  });
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

/** Places with listing delivery first, then airports before cities, then alphabetical by label. */
export function compareDeliveryPlaces(
  a: DeliveryLocationView,
  b: DeliveryLocationView,
  deliverableKeys: ReadonlySet<string>,
) {
  const delivery = Number(hasListingDelivery(b, deliverableKeys)) - Number(hasListingDelivery(a, deliverableKeys));
  if (delivery !== 0) return delivery;
  const kind = Number(isCityLocation(a)) - Number(isCityLocation(b));
  if (kind !== 0) return kind;
  return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
}

/** One group per country, alphabetical; inside, delivering places first (airports, then cities). */
export function groupDeliveryByCountry(
  items: DeliveryLocationView[],
  deliverableKeys: ReadonlySet<string>,
): DeliveryCountryGroup[] {
  const map = new Map<string, DeliveryCountryGroup>();
  for (const item of items) {
    const iso2 = item.countryIso2.trim().toUpperCase() || "XX";
    let group = map.get(iso2);
    if (!group) {
      group = {
        iso2,
        name: item.country || iso2,
        items: [],
        airports: 0,
        cities: 0,
        activeAirports: 0,
        activeCities: 0,
      };
      map.set(iso2, group);
    }
    group.items.push(item);
    const active = hasListingDelivery(item, deliverableKeys);
    if (isCityLocation(item)) {
      group.cities += 1;
      if (active) group.activeCities += 1;
    } else {
      group.airports += 1;
      if (active) group.activeAirports += 1;
    }
  }
  const groups = [...map.values()];
  for (const group of groups) {
    group.items.sort((a, b) => compareDeliveryPlaces(a, b, deliverableKeys));
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
