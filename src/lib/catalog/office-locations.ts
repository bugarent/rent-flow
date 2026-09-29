import { COUNTRY_PLACES } from "@/lib/catalog/country-places-data";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { europeAndAsiaCountries, worldCountryName } from "@/lib/catalog/world-countries";

/** Resolve stored country value (ISO2 or English name) to ISO2. */
export function resolveOfficeCountryIso2(value: string | undefined | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "GE";
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const lower = raw.toLowerCase();
  const byName = europeAndAsiaCountries().find(
    (c) => c.name.toLowerCase() === lower || worldCountryName(c.iso2).toLowerCase() === lower,
  );
  if (byName) return byName.iso2;
  if (lower === "georgia") return "GE";
  return "GE";
}

/** Major cities for a country (from places catalog, else airports). */
export function majorCitiesForCountryIso2(iso2: string): Array<{ slug: string; name: string }> {
  const code = iso2.toUpperCase();
  const seed = COUNTRY_PLACES[code];
  if (seed?.cities?.length) {
    return seed.cities.map(([slug, name]) => ({ slug, name }));
  }
  const fromAirports = new Map<string, string>();
  for (const a of CATALOG_AIRPORTS) {
    if (a.countryIso2 !== code) continue;
    fromAirports.set(a.citySlug, a.cityName.en);
  }
  return [...fromAirports.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
