import type { Locale } from "@/lib/i18n/config";
import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import { rentalPlaceTitle, rentalPlaceTitles } from "@/lib/i18n/place-phrase";

type AnchorKind = "airport" | "city";

/** Short internal-link label. Never the page title or a brand slogan. */
export function cleanLocationAnchor(
  location: { kind: AnchorKind; cityName: string; iata?: string },
  locale: string,
): string {
  const code = String(location.iata || "").trim().toUpperCase();
  return rentalPlaceTitle(
    locale,
    location.kind === "airport" && code ? "airport" : "city",
    location.cityName,
    code,
  );
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

/** Short carousel heading in every UI language. Ignores stored SEO titles and slogans. */
export function popularCardHeadings(iata: string): Record<Locale, string> {
  const code = normalizeLocationCode(iata);
  const place = findSearchPlace(code);
  const kind: AnchorKind = place?.kind === "city" || /^CITY-/i.test(code) ? "city" : "airport";
  return rentalPlaceTitles(kind, place?.cityName || code, kind === "airport" ? place?.iata || code : undefined);
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
