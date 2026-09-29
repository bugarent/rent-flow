import { requirePartner } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PartnerPersonalInfoForm } from "@/components/partner/partner-personal-info-form";
import { defaultCompanySettings } from "@/lib/partners/company-settings";
import { resolveCompanySettings, readCompanySettingsFile } from "@/lib/server/partner-company-settings-store";
import { resolvePartnerSeasonalPricing } from "@/lib/server/partner-seasonal-pricing-store";
import {
  resolveProfileModeration,
  readProfileModerationFile,
} from "@/lib/server/partner-profile-moderation-store";
import { canEditDeliveryCountries } from "@/lib/partners/profile-moderation";
import { listPartnerOperatingCountries } from "@/lib/server/partner-operating-countries";
import { getFxRates, defaultFxRates } from "@/lib/server/preferences";
import { formatPartnerCode } from "@/lib/ids";
import { ensurePartnerSequentialNumber } from "@/lib/sequential-ids";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";

export default async function PartnerPersonalInfoPage() {
  const session = await requirePartner();
  let settings = defaultCompanySettings({
    companyName: "",
    email: session.user.email ?? "",
    phone: "",
  });
  let countriesEditable = true;
  let countriesEditUnlockUntil: string | null = null;
  let partnerStatus = "PENDING";
  let pendingRemoderation = false;
  let partnerCode: string | null = null;
  let lastAdminNote: string | null = null;
  let catalogCountries: Array<{ iso2: string; name: string; hoverRegion: "Europe" | "Asia" }> = [];
  let fxRates = defaultFxRates();
  try {
    fxRates = await getFxRates();
  } catch {
    /* defaults */
  }

  try {
    catalogCountries = await listPartnerOperatingCountries();
  } catch {
    catalogCountries = [];
  }

  let loaded = false;
  try {
    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
    if (partner) {
      loaded = true;
      partnerStatus = partner.status;
      // Prefer existing code — do not block page open on sequential-id write.
      partnerCode = formatPartnerCode(partner.sequentialNumber);
      if (!partnerCode) {
        try {
          const seq = await ensurePartnerSequentialNumber(partner.id);
          partnerCode = formatPartnerCode(seq ?? partner.sequentialNumber);
        } catch {
          partnerCode = null;
        }
      }
      settings = await resolveCompanySettings(partner);
      const moderation = await resolveProfileModeration(
        partner as { id: string; profileModeration?: unknown },
      );
      countriesEditable = canEditDeliveryCountries({
        status: partner.status,
        approvedAt: partner.approvedAt,
        moderation,
      });
      countriesEditUnlockUntil = moderation.countriesEditUnlockUntil;
      pendingRemoderation = partner.status === "PENDING_REMODERATION";
      lastAdminNote = moderation.lastAdminNote;
      try {
        const seasonal = await resolvePartnerSeasonalPricing(partner);
        if (seasonal.enabled || seasonal.seasons.length) {
          settings = {
            ...settings,
            seasonalPricing: seasonal,
          };
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* offline defaults */
  }

  if (!loaded && (session.user.id === LOCAL_PARTNER_ID || loadLocalPartner()?.id === session.user.id)) {
    const partnerId = LOCAL_PARTNER_ID;
    const local = loadLocalPartner();
    const fileSettings = await readCompanySettingsFile(partnerId);
    if (fileSettings) settings = fileSettings;
    else if (local) {
      settings = defaultCompanySettings({
        companyName: local.companyName,
        email: local.email,
        phone: "",
      });
    }
    const moderation = await readProfileModerationFile(partnerId);
    pendingRemoderation = moderation.pendingChanges.length > 0;
    lastAdminNote = moderation.lastAdminNote;
    partnerStatus = pendingRemoderation ? "PENDING_REMODERATION" : "APPROVED";
    countriesEditable = canEditDeliveryCountries({
      status: partnerStatus,
      approvedAt: new Date(),
      moderation,
    });
    countriesEditUnlockUntil = moderation.countriesEditUnlockUntil;
    partnerCode = partnerCode || formatPartnerCode(
      (await (await import("@/lib/server/ensure-file-partner-code")).ensureFilePartnerSequentialNumber({
        partnerId,
        email: settings.email || local?.email || session.user.email,
      })) ?? null,
    );
  }

  return (
    <PartnerPersonalInfoForm
      initial={settings}
      catalogCountries={catalogCountries}
      countriesEditable={countriesEditable}
      countriesEditUnlockUntil={countriesEditUnlockUntil}
      partnerStatus={partnerStatus}
      pendingRemoderation={pendingRemoderation}
      partnerCode={partnerCode}
      fxRates={fxRates}
      lastAdminNote={lastAdminNote}
    />
  );
}
