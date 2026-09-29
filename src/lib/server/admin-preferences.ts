import { cookies } from "next/headers";
import {
  ADMIN_CURRENCY_COOKIE,
  ADMIN_LOCALE_COOKIE,
  DEFAULT_ADMIN_CURRENCY,
  DEFAULT_ADMIN_LOCALE,
  isAdminCurrency,
  isAdminLocale,
  type AdminCurrency,
  type AdminLocale,
} from "@/lib/i18n/admin-config";

/** Independent of public `rac_locale` — admin panel language only. */
export async function readAdminLocale(): Promise<AdminLocale> {
  const jar = await cookies();
  const raw = jar.get(ADMIN_LOCALE_COOKIE)?.value;
  return isAdminLocale(raw) ? raw : DEFAULT_ADMIN_LOCALE;
}

export async function readAdminCurrency(): Promise<AdminCurrency> {
  const jar = await cookies();
  const raw = jar.get(ADMIN_CURRENCY_COOKIE)?.value;
  return isAdminCurrency(raw) ? raw : DEFAULT_ADMIN_CURRENCY;
}

export async function readAdminPreferences(): Promise<{
  locale: AdminLocale;
  currency: AdminCurrency;
}> {
  const jar = await cookies();
  const localeRaw = jar.get(ADMIN_LOCALE_COOKIE)?.value;
  const currencyRaw = jar.get(ADMIN_CURRENCY_COOKIE)?.value;
  return {
    locale: isAdminLocale(localeRaw) ? localeRaw : DEFAULT_ADMIN_LOCALE,
    currency: isAdminCurrency(currencyRaw) ? currencyRaw : DEFAULT_ADMIN_CURRENCY,
  };
}
