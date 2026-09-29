import {
  CURRENCIES,
  CURRENCY_LABELS,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_LABELS,
  isCurrency,
  isLocale,
  type Currency,
  type Locale,
} from "@/lib/i18n/config";

/** Business-partner cabinet shares the public language list. */
export const BUSINESS_PARTNER_LOCALES = LOCALES;
export type BusinessPartnerLocale = Locale;

export const DEFAULT_BUSINESS_PARTNER_LOCALE: BusinessPartnerLocale = DEFAULT_LOCALE;

/** Independent of public, admin, and rental-partner preferences. */
export const BUSINESS_PARTNER_LOCALE_COOKIE = "rac_bp_locale";
export const BUSINESS_PARTNER_LOCALE_STORAGE = "rac_bp_locale";

export const BUSINESS_PARTNER_LOCALE_LABELS = LOCALE_LABELS;

export function isBusinessPartnerLocale(
  value: string | undefined | null,
): value is BusinessPartnerLocale {
  return isLocale(value);
}

export const BUSINESS_PARTNER_CURRENCIES = CURRENCIES;
export type BusinessPartnerCurrency = Currency;

export const DEFAULT_BUSINESS_PARTNER_CURRENCY: BusinessPartnerCurrency = DEFAULT_CURRENCY;

export const BUSINESS_PARTNER_CURRENCY_COOKIE = "rac_bp_currency";
export const BUSINESS_PARTNER_CURRENCY_STORAGE = "rac_bp_currency";

export const BUSINESS_PARTNER_CURRENCY_LABELS = CURRENCY_LABELS;

export function isBusinessPartnerCurrency(
  value: string | undefined | null,
): value is BusinessPartnerCurrency {
  return isCurrency(value);
}
