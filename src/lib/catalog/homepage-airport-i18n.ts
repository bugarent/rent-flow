import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { placeLabel } from "@/lib/i18n/place-label";
import { autoSeoDescription, autoSeoTitle } from "@/lib/catalog/airport-seo";

export type AirportCardTranslation = {
  title?: string;
  infoText?: string;
  /** Google result title (meta title) in this language. */
  seoTitle?: string;
  /** Google result snippet (meta description) in this language. */
  seoDescription?: string;
};
export type AirportCardTranslations = Partial<Record<Locale, AirportCardTranslation>>;

type LocalizableAirportCard = {
  iata: string;
  title: string;
  infoText?: string;
  seoTitle?: string;
  seoDescription?: string;
  translations?: AirportCardTranslations;
};

/** Georgian locative forms read better than "<airport> აეროპორტი" in a heading. */
const KA_AIRPORT_IN: Record<string, string> = {
  KUT: "ქუთაისის აეროპორტში",
  TBS: "თბილისის აეროპორტში",
  BUS: "ბათუმის აეროპორტში",
};

const RENTAL_TITLE: Record<Locale, string> = {
  en: "Car rental at {airport}",
  ka: "მანქანის ქირაობა {airport}",
  ru: "Аренда авто в аэропорту {airport}",
  de: "Mietwagen am {airport}",
  es: "Alquiler de coches en {airport}",
  fr: "Location de voiture à {airport}",
  it: "Noleggio auto a {airport}",
  nl: "Autoverhuur op {airport}",
  pl: "Wynajem samochodów: {airport}",
  tr: "{airport} araç kiralama",
  ar: "تأجير السيارات في {airport}",
  zh: "{airport}租车",
  ko: "{airport} 렌터카",
  th: "เช่ารถที่{airport}",
};

/** "Car rental at {airport}" in each language (for airports outside the main catalog). */
export function rentalTitleTemplate(locale: Locale): string {
  return RENTAL_TITLE[locale];
}

/** Whether the built-in catalog already builds a localized title for this code. */
export function hasCatalogAirportTitle(iata: string): boolean {
  const code = iata.trim().toUpperCase();
  return CATALOG_AIRPORTS.some((item) => item.iata === code);
}

export function asCardLocale(locale: string): Locale {
  return (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
}

const GEORGIAN_SCRIPT = /[\u10A0-\u10FF]/;

/** Language the admin typed the base title/info in (Georgian script → ka, otherwise en). */
export function airportCopySourceLocale(card: { title?: string; infoText?: string }): Locale {
  return GEORGIAN_SCRIPT.test(`${card.title || ""} ${card.infoText || ""}`) ? "ka" : "en";
}

function sourceLocale(card: LocalizableAirportCard): Locale {
  return airportCopySourceLocale(card);
}

/** Locales that still need a translated preface. The source language uses `infoText` itself. */
export function missingAirportInfoLocales(card: LocalizableAirportCard): Locale[] {
  const base = String(card.infoText || "").trim();
  if (!base) return [];
  const source = sourceLocale(card);
  return LOCALES.filter((lang) => {
    if (lang === source) return false;
    return !card.translations?.[lang]?.infoText?.trim();
  });
}

/** Locales that still need a translated card title. The source language uses `title` itself. */
export function missingAirportTitleLocales(card: LocalizableAirportCard): Locale[] {
  if (!card.title.trim()) return [];
  const source = sourceLocale(card);
  return LOCALES.filter((lang) => lang !== source && !card.translations?.[lang]?.title?.trim());
}

function autoTitle(locale: Locale, iata: string): string | null {
  const code = iata.trim().toUpperCase();
  const airport = CATALOG_AIRPORTS.find((item) => item.iata === code);
  if (!airport) return null;
  if (locale === "ka") {
    const place = KA_AIRPORT_IN[code] || `${airport.cityName.ka || airport.cityName.en}ის აეროპორტში`;
    return `${RENTAL_TITLE.ka.replace("{airport}", place)} (${code})`;
  }
  if (locale === "ru") {
    const city = airport.cityName.ru || airport.cityName.en;
    return `${RENTAL_TITLE.ru.replace("{airport}", city)} (${code})`;
  }
  const name = placeLabel(locale, `${airport.name.en} (${code})`);
  return RENTAL_TITLE[locale].replace("{airport}", name);
}

/** Card heading in the visitor's language. */
export function localizedAirportTitle(card: LocalizableAirportCard, locale: string): string {
  const lang = asCardLocale(locale);
  const own = card.translations?.[lang]?.title?.trim();
  if (own) return own;
  if (sourceLocale(card) === lang && card.title.trim()) return card.title.trim();
  return autoTitle(lang, card.iata) || placeLabel(lang, card.title);
}

/** Details text in the visitor's language; falls back to English, then the original text. */
export function localizedAirportInfo(card: LocalizableAirportCard, locale: string): string {
  const lang = asCardLocale(locale);
  const own = card.translations?.[lang]?.infoText?.trim();
  if (own) return own;
  const base = String(card.infoText || "").trim();
  if (sourceLocale(card) === lang && base) return base;
  return card.translations?.en?.infoText?.trim() || base;
}

/** Locales that still need a translated SEO title / description (only when a base one exists). */
export function missingAirportSeoLocales(card: LocalizableAirportCard): Locale[] {
  const hasTitle = Boolean(card.seoTitle?.trim());
  const hasDescription = Boolean(card.seoDescription?.trim());
  if (!hasTitle && !hasDescription) return [];
  const source = sourceLocale(card);
  return LOCALES.filter((lang) => {
    if (lang === source) return false;
    const row = card.translations?.[lang];
    return (hasTitle && !row?.seoTitle?.trim()) || (hasDescription && !row?.seoDescription?.trim());
  });
}

/**
 * Meta title + description in the visitor's language: the admin's (or translated) text,
 * else built from the card heading and page text so every language has a good snippet.
 */
export function localizedAirportSeo(
  card: LocalizableAirportCard,
  locale: string,
  opts: { airportName: string },
): { title: string; description: string } {
  const lang = asCardLocale(locale);
  const own = card.translations?.[lang];
  const isSource = sourceLocale(card) === lang;
  const title =
    own?.seoTitle?.trim() ||
    (isSource ? card.seoTitle?.trim() : "") ||
    autoSeoTitle(localizedAirportTitle(card, lang));
  const description =
    own?.seoDescription?.trim() ||
    (isSource ? card.seoDescription?.trim() : "") ||
    autoSeoDescription({
      locale: lang,
      airportName: opts.airportName,
      code: card.iata.trim().toUpperCase(),
      infoText: localizedAirportInfo(card, lang),
    });
  return { title, description };
}

/** Keep only non-empty, known-locale translation entries. */
export function cleanAirportTranslations(raw: unknown): AirportCardTranslations {
  const out: AirportCardTranslations = {};
  if (!raw || typeof raw !== "object") return out;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(LOCALES as readonly string[]).includes(key) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const entry: AirportCardTranslation = {
      title: text(row.title, 120),
      infoText: text(row.infoText, 8000),
      seoTitle: text(row.seoTitle, 70),
      seoDescription: text(row.seoDescription, 170),
    };
    for (const field of Object.keys(entry) as Array<keyof AirportCardTranslation>) {
      if (!entry[field]) delete entry[field];
    }
    if (Object.keys(entry).length) out[key as Locale] = entry;
  }
  return out;
}
