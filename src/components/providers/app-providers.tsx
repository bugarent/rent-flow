"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PreferencesProvider } from "@/components/providers/preferences-context";
import { PortalSessionProvider } from "@/components/auth/portal-session-provider";
import { BusinessPartnerReferralCapture } from "@/components/business/business-partner-referral-capture";
import type { Currency, Locale } from "@/lib/i18n/config";
import type { FxRates } from "@/lib/fx";
import { isAdminPath, isPartnerPath } from "@/lib/routes";

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
  const pathname = usePathname() || "/";
  // Admin and partner pages mount their own session provider. Nesting the
  // customer provider overwrites NextAuth's single base path, so partner
  // sign-in was sent to the customer login route and rejected.
  const dedicatedPortal = isAdminPath(pathname) || isPartnerPath(pathname);
  const tree = (
    <PreferencesProvider initialLocale={locale} initialCurrency={currency} fxRates={fxRates}>
      <Suspense fallback={null}>
        <BusinessPartnerReferralCapture />
      </Suspense>
      {children}
    </PreferencesProvider>
  );
  if (dedicatedPortal) return tree;
  return <PortalSessionProvider portal="customer">{tree}</PortalSessionProvider>;
}
