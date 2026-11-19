import type { Locale } from "@/lib/i18n/config";
import { cityDisplayName } from "@/lib/i18n/place-label";
import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";

type AnchorKind = "airport" | "city";

const AIRPORT: Record<Locale, (city: string, code: string) => string> = {
  en: (city, code) => `Car Rental ${city} Airport (${code})`,
  ka: (city, code) => `მანქანის დაქირავება ${city} აეროპორტი (${code})`,
  ru: (city, code) => `Аренда авто ${city} аэропорт (${code})`,
  de: (city, code) => `Mietwagen ${city} Flughafen (${code})`,
  es: (city, code) => `Alquiler de coches ${city} aeropuerto (${code})`,
  fr: (city, code) => `Location de voiture ${city} aéroport (${code})`,
  it: (city, code) => `Noleggio auto ${city} aeroporto (${code})`,
  nl: (city, code) => `Autoverhuur ${city} luchthaven (${code})`,
  pl: (city, code) => `Wynajem aut ${city} lotnisko (${code})`,
  tr: (city, code) => `${city} havalimanı araç kiralama (${code})`,
  ar: (city, code) => `تأجير سيارات مطار ${city} (${code})`,
  zh: (city, code) => `${city}机场租车 (${code})`,
  ko: (city, code) => `${city} 공항 렌터카 (${code})`,
  th: (city, code) => `เช่ารถสนามบิน${city} (${code})`,
};

const CITY: Record<Locale, (city: string) => string> = {
  en: (city) => `Car Rental ${city}`,
  ka: (city) => `მანქანის დაქირავება ${city}`,
  ru: (city) => `Аренда авто ${city}`,
  de: (city) => `Mietwagen ${city}`,
  es: (city) => `Alquiler de coches ${city}`,
  fr: (city) => `Location de voiture ${city}`,
  it: (city) => `Noleggio auto ${city}`,
  nl: (city) => `Autoverhuur ${city}`,
  pl: (city) => `Wynajem aut ${city}`,
  tr: (city) => `${city} araç kiralama`,
  ar: (city) => `تأجير سيارات ${city}`,
  zh: (city) => `${city}租车`,
  ko: (city) => `${city} 렌터카`,
  th: (city) => `เช่ารถ${city}`,
};

function asLocale(locale: string): Locale {
  return locale in AIRPORT ? (locale as Locale) : "en";
}

/** Short internal-link label. Never the page title or a brand slogan. */
export function cleanLocationAnchor(
  location: { kind: AnchorKind; cityName: string; iata?: string },
  locale: string,
): string {
  const lang = asLocale(locale);
  const city = cityDisplayName(lang, location.cityName) || location.cityName;
  const code = String(location.iata || "").trim().toUpperCase();
  if (location.kind === "airport" && code) return AIRPORT[lang](city, code);
  return CITY[lang](city);
}

/** Same country first, then others. Drops the current page and duplicate slugs. */
export function uniqueOtherLocations<T extends { code: string; slug: string; countryIso2: string }>(
  all: T[],
  current: { code: string; slug: string; countryIso2: string },
  limit = 12,
): T[] {
  const seen = new Set<string>();
  const same = all.filter((row) => row.countryIso2 && row.countryIso2 === current.countryIso2);
  const out: T[] = [];
  for (const row of [...same, ...all]) {
    if (row.code === current.code || (current.slug && row.slug === current.slug)) continue;
    const key = (row.slug || row.code).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/** Anchor for an /airport/[code] card. Ignores the stored SEO title. */
export function airportCardLinkLabel(iata: string, locale: string): string {
  const code = normalizeLocationCode(iata);
  const place = findSearchPlace(code);
  const kind: AnchorKind = place?.kind === "city" || /^CITY-/i.test(code) ? "city" : "airport";
  return cleanLocationAnchor(
    {
      kind,
      cityName: place?.cityName || code,
      iata: kind === "airport" ? place?.iata || code : undefined,
    },
    locale,
  );
}
