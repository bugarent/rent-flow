import { CATALOG_AIRPORTS, airportsByCountry, type CatalogAirport } from "@/lib/catalog/airports";

/** Operating regions partners may select (Europe + Asia focus). */
export const OPERATING_COUNTRY_ISO2 = [
  // Asia / Caucasus / Near East
  "GE",
  "AM",
  "AZ",
  "TR",
  "AE",
  "IL",
  // Europe
  "PL",
  "FR",
  "DE",
  "GB",
  "UA",
  "IT",
  "ES",
  "GR",
  "NL",
  "CZ",
  "RO",
  "BG",
] as const;

export type OperatingCountryIso2 = (typeof OPERATING_COUNTRY_ISO2)[number];

const REGION: Record<string, "Europe" | "Asia"> = {
  GE: "Asia",
  AM: "Asia",
  AZ: "Asia",
  TR: "Asia",
  AE: "Asia",
  IL: "Asia",
  PL: "Europe",
  FR: "Europe",
  DE: "Europe",
  GB: "Europe",
  UA: "Europe",
  IT: "Europe",
  ES: "Europe",
  GR: "Europe",
  NL: "Europe",
  CZ: "Europe",
  RO: "Europe",
  BG: "Europe",
};

export function operatingCountries() {
  const byIso = new Map<string, { iso2: string; name: string; region: "Europe" | "Asia" }>();
  for (const a of CATALOG_AIRPORTS) {
    if (!(OPERATING_COUNTRY_ISO2 as readonly string[]).includes(a.countryIso2)) continue;
    if (!byIso.has(a.countryIso2)) {
      byIso.set(a.countryIso2, {
        iso2: a.countryIso2,
        name: a.countryName.en,
        region: REGION[a.countryIso2] ?? "Europe",
      });
    }
  }
  // Include countries we list even if no airport row yet
  for (const iso of OPERATING_COUNTRY_ISO2) {
    if (!byIso.has(iso)) {
      byIso.set(iso, {
        iso2: iso,
        name: iso,
        region: REGION[iso] ?? "Europe",
      });
    }
  }
  return [...byIso.values()].sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    return a.name.localeCompare(b.name);
  });
}

export function airportsForCountries(countryIso2s: string[]): CatalogAirport[] {
  const set = new Set(countryIso2s.map((c) => c.toUpperCase()));
  return CATALOG_AIRPORTS.filter((a) => set.has(a.countryIso2)).sort((a, b) =>
    a.cityName.en.localeCompare(b.cityName.en),
  );
}

export function groupAirportsByCountry(countryIso2s: string[]) {
  const airports = airportsForCountries(countryIso2s);
  return airportsByCountry(airports);
}
