import type { Metadata } from "next";
import { AdminOperationsShell } from "@/components/admin/operations-shell";
import { PortalSessionProvider } from "@/components/auth/portal-session-provider";
import { AdminLocaleProvider } from "@/components/providers/admin-locale-context";
import { readAdminPreferences } from "@/lib/server/admin-preferences";
import { defaultFxRates } from "@/lib/server/preferences";
import { cachedFxRates } from "@/lib/server/public-page-data";
import { softTimeout } from "@/lib/server/soft-timeout";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function AdminOperationsLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, currency }, fxRates] = await Promise.all([
    readAdminPreferences(),
    softTimeout(cachedFxRates(), defaultFxRates(), 300),
  ]);

  return (
    <PortalSessionProvider portal="admin">
      <AdminLocaleProvider initialLocale={locale} initialCurrency={currency} fxRates={fxRates}>
        <AdminOperationsShell>{children}</AdminOperationsShell>
      </AdminLocaleProvider>
    </PortalSessionProvider>
  );
}
