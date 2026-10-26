import {
  airportCopySourceLocale,
  hasCatalogAirportTitle,
  rentalTitleTemplate,
  type AirportCardTranslations,
} from "@/lib/catalog/homepage-airport-i18n";
import { findSearchPlace } from "@/lib/catalog/search-places";
import { placeLabel } from "@/lib/i18n/place-label";
import { LOCALES } from "@/lib/i18n/config";

/**
 * Fill missing title translations for airports outside the main catalog (e.g. TGD, TIV)
 * with "Car rental at <airport> (<code>)" in each language, so the card never stays in
 * the admin's typing language. Admin or AI translations always win. Server-only use
 * (keeps the place catalog out of client bundles).
 */
export function withAutoTitleTranslations<T extends { iata: string; title: string; translations?: AirportCardTranslations }>(
  card: T,
): T {
  const code = card.iata.trim().toUpperCase();
  if (!code || hasCatalogAirportTitle(code)) return card;
  const place = findSearchPlace(code);
  if (!place) return card;
  const source = airportCopySourceLocale(card);
  const next: AirportCardTranslations = { ...card.translations };
  for (const lang of LOCALES) {
    if (lang === source || next[lang]?.title?.trim()) continue;
    const named =
      place.kind === "city"
        ? placeLabel(lang, `${place.cityName} (city)`).replace(/\s+\([^)]+\)\s*$/, "").trim()
        : placeLabel(lang, place.label);
    next[lang] = { ...next[lang], title: rentalTitleTemplate(lang).replace("{airport}", named || place.cityName) };
  }
  return { ...card, translations: next };
}
