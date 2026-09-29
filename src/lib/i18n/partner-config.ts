import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/config";

/** Partner portal shares the public site language list. */
export const PARTNER_LOCALES = LOCALES;
export type PartnerLocale = Locale;

export const DEFAULT_PARTNER_LOCALE: PartnerLocale = DEFAULT_LOCALE;

/** Independent of public `rac_locale` and admin `rac_admin_locale`. */
export const PARTNER_LOCALE_COOKIE = "rac_partner_locale";
export const PARTNER_LOCALE_STORAGE = "rac_partner_locale";
/** Display currency for the partner cabinet only. Does not change company pricing currency or the public site. */
export const PARTNER_CURRENCY_COOKIE = "rac_partner_currency";
export const PARTNER_CURRENCY_STORAGE = "rac_partner_currency";

export const PARTNER_LOCALE_LABELS = LOCALE_LABELS;

export function isPartnerLocale(value: string | undefined | null): value is PartnerLocale {
  return !!value && (PARTNER_LOCALES as readonly string[]).includes(value);
}
