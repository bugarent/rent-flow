import { airportCountryIso2, parseCityLocationCode } from "@/lib/catalog/search-places";

/** Admin services about Georgian mountain roads: offered only for trips in Georgia. */
const GEORGIA_ONLY_PATTERNS = [/უშგულ/i, /ushguli/i, /თუშეთ/i, /tusheti/i];

type ScopedExtra = {
  name?: unknown;
  nameI18n?: Partial<Record<string, string | undefined>> | null;
} | null | undefined;

function nameTexts(service: ScopedExtra): string[] {
  if (!service) return [];
  const out: string[] = [];
  const name = service.name;
  if (typeof name === "string") out.push(name);
  else if (name && typeof name === "object") {
    const bag = name as { en?: unknown; i18n?: Record<string, unknown> };
    if (typeof bag.en === "string") out.push(bag.en);
    for (const value of Object.values(bag.i18n || {})) if (typeof value === "string") out.push(value);
  }
  for (const value of Object.values(service.nameI18n || {})) if (typeof value === "string") out.push(value);
  return out;
}

/** Countries an admin extra is limited to; empty = every country. */
export function extraCountryScope(service: ScopedExtra): string[] {
  const texts = nameTexts(service);
  return texts.some((text) => GEORGIA_ONLY_PATTERNS.some((re) => re.test(text))) ? ["GE"] : [];
}

export function extraAvailableIn(service: ScopedExtra, countryIso2s: string[]): boolean {
  const scope = extraCountryScope(service);
  if (!scope.length) return true;
  return countryIso2s.some((iso) => scope.includes(String(iso || "").toUpperCase()));
}

/** Country of a search location code (airport IATA or `CITY-XX-slug`); "" when unknown. */
export function locationCountryIso2(code: string | null | undefined): string {
  const raw = String(code || "").trim();
  if (!raw) return "";
  const city = parseCityLocationCode(raw);
  if (city) return city.iso2;
  return airportCountryIso2(raw);
}
