import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { placeLabel } from "@/lib/i18n/place-label";

export type AirportCardTranslation = { title?: string; infoText?: string };
export type AirportCardTranslations = Partial<Record<Locale, AirportCardTranslation>>;

type LocalizableAirportCard = {
  iata: string;
  title: string;
  infoText?: string;
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

export function asCardLocale(locale: string): Locale {
  return (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
}

const GEORGIAN_SCRIPT = /[\u10A0-\u10FF]/;

/** Language the admin typed the base title/info in (Georgian script → ka, otherwise en). */
function sourceLocale(card: LocalizableAirportCard): Locale {
  return GEORGIAN_SCRIPT.test(`${card.title} ${card.infoText || ""}`) ? "ka" : "en";
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

/** Keep only non-empty, known-locale translation entries. */
export function cleanAirportTranslations(raw: unknown): AirportCardTranslations {
  const out: AirportCardTranslations = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(LOCALES as readonly string[]).includes(key) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim().slice(0, 120) : "";
    const infoText = typeof row.infoText === "string" ? row.infoText.trim().slice(0, 8000) : "";
    if (title || infoText) {
      out[key as Locale] = { ...(title ? { title } : {}), ...(infoText ? { infoText } : {}) };
    }
  }
  return out;
}
