import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { worldCountryName } from "@/lib/catalog/world-countries";

export type LocationCountrySummary = {
  iso2: string;
  name: string;
  cityCount: number;
  locationCount: number;
  letter: string;
};

/** Group active delivery locations by country for the public Locations page. */
export function groupActiveLocationsByCountry(
  locations: DeliveryLocationView[],
): LocationCountrySummary[] {
  const byIso = new Map<
    string,
    { cities: Set<string>; locationCount: number; name: string }
  >();

  for (const loc of locations) {
    if (!loc.isActive) continue;
    const iso2 = String(loc.countryIso2 || "").trim().toUpperCase();
    if (iso2.length !== 2) continue;
    const existing = byIso.get(iso2) ?? {
      cities: new Set<string>(),
      locationCount: 0,
      name: loc.country?.trim() || worldCountryName(iso2) || iso2,
    };
    existing.locationCount += 1;
    const cityKey = String(loc.cityName || loc.label || loc.iata || "").trim();
    if (cityKey) existing.cities.add(cityKey.toLowerCase());
    if (!existing.name && loc.country) existing.name = loc.country.trim();
    byIso.set(iso2, existing);
  }

  return [...byIso.entries()]
    .map(([iso2, row]) => {
      const name = row.name || worldCountryName(iso2) || iso2;
      const letter = name.charAt(0).toUpperCase();
      return {
        iso2,
        name,
        cityCount: row.cities.size,
        locationCount: row.locationCount,
        letter: /[A-Z]/.test(letter) ? letter : "#",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function groupCountriesByLetter(countries: LocationCountrySummary[]) {
  const map = new Map<string, LocationCountrySummary[]>();
  for (const c of countries) {
    const list = map.get(c.letter) ?? [];
    list.push(c);
    map.set(c.letter, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export const LOCATION_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
