"use client";

import { PartnerLocaleProvider } from "@/components/providers/partner-locale-context";
import { PartnerCreateCarForm } from "@/components/partner/partner-create-car-form";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { isPartnerLocale, type PartnerLocale } from "@/lib/i18n/partner-config";
import { uiText } from "@/lib/i18n/ui-text";
import { ADMIN_BASE } from "@/lib/routes";

export function AdminListingReviewPanel({
  carId,
  backHref = `${ADMIN_BASE}/moderation?tab=listings`,
  backLabel,
}: {
  carId: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { locale: adminLocale } = useAdminLocale();
  const partnerLocale: PartnerLocale = isPartnerLocale(adminLocale) ? adminLocale : "en";
  const label =
    backLabel ?? uiText(adminLocale, "← Listings", "← განცხადებები", "← Объявления");

  return (
    <PartnerLocaleProvider initialLocale={partnerLocale} lockToInitial>
      <PartnerCreateCarForm
        carId={carId}
        adminReview={{
          backHref,
          backLabel: label,
        }}
      />
    </PartnerLocaleProvider>
  );
}
