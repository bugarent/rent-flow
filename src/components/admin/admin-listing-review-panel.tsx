"use client";

import { PartnerLocaleProvider } from "@/components/providers/partner-locale-context";
import { PartnerMoneyProvider } from "@/components/providers/partner-money-context";
import { PartnerCreateCarForm } from "@/components/partner/partner-create-car-form";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { isPartnerLocale, type PartnerLocale } from "@/lib/i18n/partner-config";
import { adminBackLabel } from "@/lib/i18n/ui-text";
import { ADMIN_BASE } from "@/lib/routes";

export function AdminListingReviewPanel({
  carId,
  backHref = `${ADMIN_BASE}/moderation?tab=listings`,
}: {
  carId: string;
  backHref?: string;
}) {
  const { locale: adminLocale, currency, fxRates } = useAdminLocale();
  const partnerLocale: PartnerLocale = isPartnerLocale(adminLocale) ? adminLocale : "en";
  const label = adminBackLabel(adminLocale, "listings");

  return (
    <PartnerLocaleProvider initialLocale={partnerLocale} lockToInitial>
      <PartnerMoneyProvider currency={currency} fxRates={fxRates}>
        <PartnerCreateCarForm
          carId={carId}
          adminReview={{
            backHref,
            backLabel: label,
          }}
        />
      </PartnerMoneyProvider>
    </PartnerLocaleProvider>
  );
}
