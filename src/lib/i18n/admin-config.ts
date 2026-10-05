import {
  CURRENCIES,
  CURRENCY_LABELS,
  DEFAULT_CURRENCY,
  LOCALE_LABELS,
  isCurrency,
  type Currency,
} from "@/lib/i18n/config";

/** Admin panel only: English, Georgian, and Russian. The public site keeps its full list. */
export const ADMIN_LOCALES = ["en", "ka", "ru"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

export const DEFAULT_ADMIN_LOCALE: AdminLocale = "en";

/** Independent of public `rac_locale` and partner `rac_partner_locale`. */
export const ADMIN_LOCALE_COOKIE = "rac_admin_locale";
export const ADMIN_LOCALE_STORAGE = "rac_admin_locale";

export const ADMIN_LOCALE_LABELS: Record<AdminLocale, string> = {
  en: LOCALE_LABELS.en,
  ka: LOCALE_LABELS.ka,
  ru: LOCALE_LABELS.ru,
};

export function isAdminLocale(value: string | undefined | null): value is AdminLocale {
  return value === "en" || value === "ka" || value === "ru";
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
