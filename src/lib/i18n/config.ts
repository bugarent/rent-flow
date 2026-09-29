export const LOCALES = [
  "en",
  "ka",
  "de",
  "es",
  "fr",
  "it",
  "nl",
  "pl",
  "tr",
  "ru",
  "ar",
  "zh",
  "ko",
  "th",
] as const;
export type Locale = (typeof LOCALES)[number];

/** Every public language in the header picker. */
export const UI_LOCALES = LOCALES;
export type UiLocale = (typeof UI_LOCALES)[number];

export function isUiLocale(value: string | undefined | null): value is UiLocale {
  return !!value && (UI_LOCALES as readonly string[]).includes(value);
}

/** Site opens in English by default. */
export const DEFAULT_LOCALE: Locale = "en";
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ka: "ქართული",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  tr: "Türkçe",
  ru: "Русский",
  ar: "العربية",
  zh: "简体中文",
  ko: "한국어",
  th: "ไทย",
};

export const LOCALE_COOKIE = "rac_locale";
export const CURRENCY_COOKIE = "rac_currency";
/** localStorage mirrors (same names as cookies for clarity). */
export const LOCALE_STORAGE = "rac_locale";
export const CURRENCY_STORAGE = "rac_currency";

export const CURRENCIES = ["EUR", "USD", "GBP", "GEL"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "EUR";

export const CURRENCY_LABELS: Record<Currency, string> = {
  EUR: "EUR €",
  USD: "USD $",
  GBP: "GBP £",
  GEL: "GEL ₾",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: Locale) {
  return RTL_LOCALES.includes(locale);
}

export function isCurrency(value: string | undefined | null): value is Currency {
  return !!value && (CURRENCIES as readonly string[]).includes(value);
}

/** Pick a localized string with English fallback. */
export function pickLocalized(
  map: Partial<Record<Locale, string>> | null | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!map) return fallback;
  const hit = map[locale] || map.en;
  return String(hit || fallback).trim() || fallback;
}
