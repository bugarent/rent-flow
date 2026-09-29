import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { COUNTRY_PLACES, FALLBACK_PLACES } from "@/lib/catalog/country-places-data";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";

export type SearchPlaceKind = "airport" | "city";

export type SearchPlace = {
  code: string;
  kind: SearchPlaceKind;
  countryIso2: string;
  name: string;
  cityName: string;
  label: string;
  iata?: string;
};

const CITY_PREFIX = "CITY-";

export function isCityLocationCode(code: string | null | undefined): boolean {
  return Boolean(code && code.toUpperCase().startsWith(CITY_PREFIX));
}

export function cityLocationCode(iso2: string, slug: string): string {
  return `${CITY_PREFIX}${iso2.toUpperCase()}-${slug.trim().toLowerCase()}`;
}

export function parseCityLocationCode(code: string): { iso2: string; slug: string } | null {
  if (!isCityLocationCode(code)) return null;
  const rest = code.slice(CITY_PREFIX.length);
  const dash = rest.indexOf("-");
  if (dash < 2) return null;
  return {
    iso2: rest.slice(0, dash).toUpperCase(),
    slug: rest.slice(dash + 1).toLowerCase(),
  };
}

export function normalizeLocationCode(code: string): string {
  const city = parseCityLocationCode(code);
  if (city) return cityLocationCode(city.iso2, city.slug);
  return code.trim().toUpperCase();
}

export function locationCodesEqual(a: string, b: string): boolean {
  return normalizeLocationCode(a) === normalizeLocationCode(b);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function airportLabel(iata: string, airportName: string): string {
  return `${airportName} (${iata})`;
}

function cityLabel(name: string): string {
  return `${name} (city)`;
}

let cached: SearchPlace[] | null = null;

export function allSearchPlaces(): SearchPlace[] {
  if (cached) return cached;
  const places: SearchPlace[] = [];
  const seen = new Set<string>();

  const add = (place: SearchPlace) => {
    const key = normalizeLocationCode(place.code);
    if (seen.has(key)) return;
    seen.add(key);
    places.push({ ...place, code: key, countryIso2: place.countryIso2.toUpperCase() });
  };

  for (const airport of CATALOG_AIRPORTS) {
    const iso2 = airport.countryIso2.toUpperCase();
    add({
      code: airport.iata.toUpperCase(),
      kind: "airport",
      countryIso2: iso2,
      name: airport.name.en,
      cityName: airport.cityName.en,
      label: airportLabel(airport.iata, airport.name.en),
      iata: airport.iata.toUpperCase(),
    });
    add({
      code: cityLocationCode(iso2, airport.citySlug || slugify(airport.cityName.en)),
      kind: "city",
      countryIso2: iso2,
      name: airport.cityName.en,
      cityName: airport.cityName.en,
      label: cityLabel(airport.cityName.en),
    });
  }

  const seeds = { ...FALLBACK_PLACES, ...COUNTRY_PLACES };
  for (const [iso2, seed] of Object.entries(seeds)) {
    const country = iso2.toUpperCase();
    for (const [iata, city, airportName] of seed.airports ?? []) {
      add({
        code: iata.toUpperCase(),
        kind: "airport",
        countryIso2: country,
        name: airportName,
        cityName: city,
        label: airportLabel(iata, airportName),
        iata: iata.toUpperCase(),
      });
      add({
        code: cityLocationCode(country, slugify(city)),
        kind: "city",
        countryIso2: country,
        name: city,
        cityName: city,
        label: cityLabel(city),
      });
    }
    for (const [slug, name] of seed.cities) {
      add({
        code: cityLocationCode(country, slug || slugify(name)),
        kind: "city",
        countryIso2: country,
        name,
        cityName: name,
        label: cityLabel(name),
      });
    }
  }

  for (const country of WORLD_COUNTRIES) {
    const hasAny = places.some((p) => p.countryIso2 === country.iso2);
    if (hasAny) continue;
    add({
      code: cityLocationCode(country.iso2, slugify(country.name)),
      kind: "city",
      countryIso2: country.iso2,
      name: country.name,
      cityName: country.name,
      label: cityLabel(country.name),
    });
  }

  cached = places.sort((a, b) => {
    if (a.countryIso2 !== b.countryIso2) {
      return worldCountryName(a.countryIso2).localeCompare(worldCountryName(b.countryIso2));
    }
    if (a.kind !== b.kind) return a.kind === "airport" ? -1 : 1;
    return a.cityName.localeCompare(b.cityName) || a.label.localeCompare(b.label);
  });
  return cached;
}

export function searchPlacesForCountry(iso2: string): SearchPlace[] {
  const code = iso2.toUpperCase();
  return allSearchPlaces().filter((p) => p.countryIso2 === code);
}

export function findSearchPlace(code: string): SearchPlace | undefined {
  const key = normalizeLocationCode(code);
  return allSearchPlaces().find((p) => p.code === key);
}

export function nearestAirportCode(code: string): string {
  const place = findSearchPlace(code);
  if (!place) return "TBS";
  if (place.kind === "airport" && place.iata) return place.iata;
  const sameCity = allSearchPlaces().find(
    (p) =>
      p.kind === "airport" &&
      p.countryIso2 === place.countryIso2 &&
      p.cityName.toLowerCase() === place.cityName.toLowerCase(),
  );
  if (sameCity?.iata) return sameCity.iata;
  const sameCountry = allSearchPlaces().find((p) => p.kind === "airport" && p.countryIso2 === place.countryIso2);
  return sameCountry?.iata ?? "TBS";
}

/** City plus the street and number the customer typed. Skips the city when it is already in the text. */
export function composeLocationAddress(
  city: string | null | undefined,
  street: string | null | undefined,
): string {
  const place = String(street || "").replace(/\s+/g, " ").trim();
  const town = String(city || "").replace(/\s+/g, " ").trim();
  if (!place) return town;
  if (!town) return place;
  if (place.toLocaleLowerCase().includes(town.toLocaleLowerCase())) return place;
  return `${town}, ${place}`;
}

/** Full city-delivery address. Airport codes stay unchanged (returns null). */
export function cityStreetLabel(code: string, street: string | null | undefined): string | null {
  const place = findSearchPlace(code);
  if (!place || place.kind !== "city") return null;
  const streetText = String(street || "").trim();
  if (!streetText) return place.cityName;
  return composeLocationAddress(place.cityName, streetText);
}
