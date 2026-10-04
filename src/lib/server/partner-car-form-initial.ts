import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isMandatoryFreeExtra, type ExtraServicePricing } from "@/lib/extras/pricing";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { prisma } from "@/lib/prisma";
import { listExtraServices } from "@/lib/server/extras-store";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";
import {
  readCompanySettingsFile,
  resolveCompanySettings,
} from "@/lib/server/partner-company-settings-store";
import { loadPartnerDeliveryCatalog } from "@/lib/server/partner-delivery-catalog";

type SessionUser = { id: string; email?: string | null };

async function resolvePartner(user: SessionUser) {
  try {
    const row = await prisma.partner.findUnique({ where: { userId: user.id } });
    if (row?.id) return { partnerId: row.id, row };
  } catch {
    /* DB offline — fall back to file stores */
  }
  const local = loadLocalPartner();
  const email = user.email?.toLowerCase();
  if (
    user.id === LOCAL_PARTNER_ID ||
    local?.id === user.id ||
    (email && local?.email && email === local.email.toLowerCase())
  ) {
    return { partnerId: LOCAL_PARTNER_ID, row: null };
  }
  return { partnerId: user.id || LOCAL_PARTNER_ID, row: null };
}

/** Server-side data so the partner car form renders locations/extras on first paint. */
export async function loadPartnerCarFormInitial(user: SessionUser): Promise<{
  initialDeliveryCatalog: DeliveryLocationView[];
  initialExtrasCatalog: ExtraServicePricing[];
}> {
  try {
    const { partnerId, row } = await resolvePartner(user);
    const company = await (row
      ? resolveCompanySettings(row)
      : readCompanySettingsFile(partnerId)
    ).catch(() => null);
    const [delivery, extras, prefs] = await Promise.all([
      loadPartnerDeliveryCatalog(partnerId, company?.deliveryLocationIds || []),
      listExtraServices({ activeOnly: true }),
      readPartnerExtraPrefs(partnerId),
    ]);
    const enabledIds = new Set(
      prefs.filter((p) => p.enabled || p.forbidden).map((p) => p.extraServiceId),
    );
    const hasPrefs = prefs.length > 0;
    return {
      initialDeliveryCatalog: delivery,
      initialExtrasCatalog: extras.filter((service) => {
        if (isMandatoryFreeExtra(service)) return true;
        if (!hasPrefs) return false;
        return enabledIds.has(service.id);
      }),
    };
  } catch {
    try {
      const extras = await listExtraServices({ activeOnly: true });
      return {
        initialDeliveryCatalog: [],
        initialExtrasCatalog: extras.filter((s) => isMandatoryFreeExtra(s)),
      };
    } catch {
      return { initialDeliveryCatalog: [], initialExtrasCatalog: [] };
    }
  }
}
