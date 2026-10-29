import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { isMandatoryExtra, type ExtraServicePricing } from "@/lib/extras/pricing";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { prisma } from "@/lib/prisma";
import { listExtraServices } from "@/lib/server/extras-store";
import { scopeExtrasToPartner } from "@/lib/server/extras/partner-country-scope";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";
import {
  readCompanySettingsFile,
  resolveCompanySettings,
} from "@/lib/server/partner-company-settings-store";
import { loadPartnerDeliveryCatalog } from "@/lib/server/partner-delivery-catalog";
import type { TariffInterval } from "@/lib/partners/company-settings";
import {
  listPartnerCarCategoryOptions,
  type PartnerCarCategoryOption,
} from "@/lib/server/partner-car-categories";

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

/** Server-side data so the partner car form renders locations/extras/tariff ranges on first paint. */
export async function loadPartnerCarFormInitial(user: SessionUser): Promise<{
  initialDeliveryCatalog: DeliveryLocationView[];
  initialExtrasCatalog: ExtraServicePricing[];
  initialTariffs?: TariffInterval[];
  initialCategories: PartnerCarCategoryOption[];
}> {
  const categoriesPromise = listPartnerCarCategoryOptions();
  try {
    const { partnerId, row } = await resolvePartner(user);
    const company = await (row
      ? resolveCompanySettings(row)
      : readCompanySettingsFile(partnerId)
    ).catch(() => null);
    const [delivery, extras, prefs, initialCategories] = await Promise.all([
      loadPartnerDeliveryCatalog(partnerId, company?.deliveryLocationIds || []),
      listExtraServices({ activeOnly: true }),
      readPartnerExtraPrefs(partnerId),
      categoriesPromise,
    ]);
    const enabledIds = new Set(
      prefs.filter((p) => p.enabled || p.forbidden).map((p) => p.extraServiceId),
    );
    const offered = extras.filter(
      (service) =>
        isMandatoryExtra(service) || !isCrossBorderExtra(service) || enabledIds.has(service.id),
    );
    return {
      initialDeliveryCatalog: delivery,
      initialExtrasCatalog: await scopeExtrasToPartner(offered, partnerId, company?.deliveryCountryIso2s),
      initialTariffs: company?.tariffs?.length ? company.tariffs : undefined,
      initialCategories,
    };
  } catch {
    const initialCategories = await categoriesPromise;
    try {
      const extras = await listExtraServices({ activeOnly: true });
      return {
        initialDeliveryCatalog: [],
        initialExtrasCatalog: extras.filter((s) => isMandatoryExtra(s)),
        initialCategories,
      };
    } catch {
      return { initialDeliveryCatalog: [], initialExtrasCatalog: [], initialCategories };
    }
  }
}
