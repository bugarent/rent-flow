"use client";

import { Suspense } from "react";
import { PreferencesProvider } from "@/components/providers/preferences-context";
import { PortalSessionProvider } from "@/components/auth/portal-session-provider";
import { BusinessPartnerReferralCapture } from "@/components/business/business-partner-referral-capture";
import type { Currency, Locale } from "@/lib/i18n/config";
import type { FxRates } from "@/lib/fx";

export function AppProviders({
  children,
  locale,
  currency,
  fxRates,
}: {
  children: React.ReactNode;
  locale: Locale;
  currency: Currency;
  fxRates: FxRates;
}) {
  return (
    <PortalSessionProvider portal="customer">
      <PreferencesProvider initialLocale={locale} initialCurrency={currency} fxRates={fxRates}>
        <Suspense fallback={null}>
          <BusinessPartnerReferralCapture />
        </Suspense>
        {children}
      </PreferencesProvider>
    </PortalSessionProvider>
  );
}
