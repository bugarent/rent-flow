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

/** Admin panel shares the public site language list (dictionaries fall back to EN). */
export const ADMIN_LOCALES = LOCALES;
export type AdminLocale = Locale;

export const DEFAULT_ADMIN_LOCALE: AdminLocale = DEFAULT_LOCALE;

/** Independent of public `rac_locale` and partner `rac_partner_locale`. */
export const ADMIN_LOCALE_COOKIE = "rac_admin_locale";
export const ADMIN_LOCALE_STORAGE = "rac_admin_locale";

export const ADMIN_LOCALE_LABELS = LOCALE_LABELS;

export function isAdminLocale(value: string | undefined | null): value is AdminLocale {
  return isLocale(value);
}

/** Display currency for admin money (bookings, refunds, financials). */
export const ADMIN_CURRENCIES = CURRENCIES;
export type AdminCurrency = Currency;

export const DEFAULT_ADMIN_CURRENCY: AdminCurrency = DEFAULT_CURRENCY;

export const ADMIN_CURRENCY_COOKIE = "rac_admin_currency";
export const ADMIN_CURRENCY_STORAGE = "rac_admin_currency";

export const ADMIN_CURRENCY_LABELS = CURRENCY_LABELS;

export function isAdminCurrency(value: string | undefined | null): value is AdminCurrency {
  return isCurrency(value);
}
