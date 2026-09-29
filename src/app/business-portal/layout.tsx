import type { Metadata } from "next";
import { BusinessPortalShell } from "@/components/business/business-portal-shell";
import { BusinessPartnerPreferencesProvider } from "@/components/providers/business-partner-preferences-context";
import { readBusinessPartnerPreferences } from "@/lib/server/business-partner-preferences";
import { getFxRates } from "@/lib/server/preferences";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BusinessPortalLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, currency }, fxRates] = await Promise.all([
    readBusinessPartnerPreferences(),
    getFxRates(),
  ]);

  return (
    <BusinessPartnerPreferencesProvider
      initialLocale={locale}
      initialCurrency={currency}
      fxRates={fxRates}
    >
      <BusinessPortalShell>{children}</BusinessPortalShell>
    </BusinessPartnerPreferencesProvider>
  );
}
