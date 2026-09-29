import { cookies } from "next/headers";
import {
  BUSINESS_PARTNER_CURRENCY_COOKIE,
  BUSINESS_PARTNER_LOCALE_COOKIE,
  DEFAULT_BUSINESS_PARTNER_CURRENCY,
  DEFAULT_BUSINESS_PARTNER_LOCALE,
  isBusinessPartnerCurrency,
  isBusinessPartnerLocale,
  type BusinessPartnerCurrency,
  type BusinessPartnerLocale,
} from "@/lib/i18n/business-partner-config";

/** Business-partner cabinet language and display currency. Does not read public cookies. */
export async function readBusinessPartnerPreferences(): Promise<{
  locale: BusinessPartnerLocale;
  currency: BusinessPartnerCurrency;
}> {
  const jar = await cookies();
  const localeRaw = jar.get(BUSINESS_PARTNER_LOCALE_COOKIE)?.value;
  const currencyRaw = jar.get(BUSINESS_PARTNER_CURRENCY_COOKIE)?.value;
  return {
    locale: isBusinessPartnerLocale(localeRaw) ? localeRaw : DEFAULT_BUSINESS_PARTNER_LOCALE,
    currency: isBusinessPartnerCurrency(currencyRaw)
      ? currencyRaw
      : DEFAULT_BUSINESS_PARTNER_CURRENCY,
  };
}
