import { cookies } from "next/headers";
import {
  DEFAULT_PARTNER_LOCALE,
  PARTNER_CURRENCY_COOKIE,
  PARTNER_LOCALE_COOKIE,
  isPartnerLocale,
  type PartnerLocale,
} from "@/lib/i18n/partner-config";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import {
  isPartnerPricingCurrency,
  type PartnerPricingCurrency,
} from "@/lib/partners/company-settings";

/** Partner cabinet follows the language chosen on the public site, then its own cookie. */
export async function readPartnerLocale(): Promise<PartnerLocale> {
  const jar = await cookies();
  const shared = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(shared) && isPartnerLocale(shared)) return shared;
  const raw = jar.get(PARTNER_LOCALE_COOKIE)?.value;
  return isPartnerLocale(raw) ? raw : DEFAULT_PARTNER_LOCALE;
}

/** Partner cabinet display currency. Falls back to the company pricing currency when unset. */
export async function readPartnerDisplayCurrency(
  fallback: PartnerPricingCurrency,
): Promise<PartnerPricingCurrency> {
  const jar = await cookies();
  const raw = jar.get(PARTNER_CURRENCY_COOKIE)?.value;
  return isPartnerPricingCurrency(raw) ? raw : fallback;
}
