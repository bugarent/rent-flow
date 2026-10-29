import type { Metadata } from "next";
import { PartnerPortalShell } from "@/components/partner/portal-shell";
import { PortalSessionProvider } from "@/components/auth/portal-session-provider";
import { PartnerLocaleProvider } from "@/components/providers/partner-locale-context";
import { PartnerMoneyProvider } from "@/components/providers/partner-money-context";
import { readPartnerDisplayCurrency, readPartnerLocale } from "@/lib/server/partner-preferences";
import { defaultFxRates } from "@/lib/server/preferences";
import { cachedFxRates } from "@/lib/server/public-page-data";
import { softTimeout } from "@/lib/server/soft-timeout";
import {
  DEFAULT_PARTNER_PRICING_CURRENCY,
  type PartnerPricingCurrency,
} from "@/lib/partners/company-settings";
import { getPartnerSession } from "@/lib/auth/sessions";
import { resolveCompanySettings } from "@/lib/server/partner-company-settings-store";
import { prisma } from "@/lib/prisma";
import { normalizeLogin } from "@/lib/crypto";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

async function readPartnerPricingCurrency(): Promise<PartnerPricingCurrency> {
  try {
    const session = await getPartnerSession();
    if (!session?.user) return DEFAULT_PARTNER_PRICING_CURRENCY;
    const email = normalizeLogin(session.user.email || "");
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.id === LOCAL_PARTNER_ID ? [{ id: LOCAL_PARTNER_ID }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });
    if (!partner) return DEFAULT_PARTNER_PRICING_CURRENCY;
    const settings = await resolveCompanySettings(partner);
    return settings.pricingCurrency || DEFAULT_PARTNER_PRICING_CURRENCY;
  } catch {
    return DEFAULT_PARTNER_PRICING_CURRENCY;
  }
}

export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  // A cold database must not hold every cabinet page; the cookie currency needs no query at all.
  const cookieCurrency = await readPartnerDisplayCurrency("" as PartnerPricingCurrency);
  const [locale, fxRates, companyCurrency] = await Promise.all([
    readPartnerLocale(),
    softTimeout(cachedFxRates(), defaultFxRates(), 1200),
    cookieCurrency
      ? Promise.resolve(cookieCurrency)
      : softTimeout(readPartnerPricingCurrency(), DEFAULT_PARTNER_PRICING_CURRENCY, 1500),
  ]);
  const pricingCurrency = cookieCurrency || companyCurrency;

  return (
    <PortalSessionProvider portal="partner">
      <PartnerLocaleProvider initialLocale={locale}>
        <PartnerMoneyProvider initialCurrency={pricingCurrency} fxRates={fxRates}>
          <PartnerPortalShell>{children}</PartnerPortalShell>
        </PartnerMoneyProvider>
      </PartnerLocaleProvider>
    </PortalSessionProvider>
  );
}
