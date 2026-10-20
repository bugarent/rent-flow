import {
  airportCopySourceLocale,
  hasCatalogAirportTitle,
  rentalTitleTemplate,
  type AirportCardTranslations,
} from "@/lib/catalog/homepage-airport-i18n";
import { findSearchPlace } from "@/lib/catalog/search-places";
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
  const airport = `${place.name.replace(new RegExp(`\\s*\\(${code}\\)\\s*$`), "")} (${code})`;
  const source = airportCopySourceLocale(card);
  const next: AirportCardTranslations = { ...card.translations };
  for (const lang of LOCALES) {
    if (lang === source || next[lang]?.title?.trim()) continue;
    next[lang] = { ...next[lang], title: rentalTitleTemplate(lang).replace("{airport}", airport) };
  }
  return { ...card, translations: next };
}
