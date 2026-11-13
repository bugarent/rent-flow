import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { isMandatoryExtra, type ExtraServicePricing } from "@/lib/extras/pricing";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { prisma } from "@/lib/prisma";
import { listExtraServices } from "@/lib/server/extras-store";
import { scopeExtrasToPartner } from "@/lib/server/extras/partner-country-scope";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";
import { listPartnerCarsForExtras } from "@/lib/server/partner-extras-fleet";
import { partnerCabinetDefaults, partnerServiceAdded } from "@/lib/extras/partner-service-choice";
import type { CarFormExtraPref } from "@/components/partner/partner-extras-fields";
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
  /** Cabinet state of each service in `initialExtrasCatalog`; present only when the partner's list loaded. */
  initialExtraPrefs?: CarFormExtraPref[];
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
    const [delivery, extras, prefs, initialCategories, fleet] = await Promise.all([
      loadPartnerDeliveryCatalog(partnerId, company?.deliveryLocationIds || []),
      listExtraServices({ activeOnly: true }),
      readPartnerExtraPrefs(partnerId),
      categoriesPromise,
      listPartnerCarsForExtras({ user }, partnerId).catch(() => null),
    ]);
    const prefById = new Map(prefs.map((p) => [p.extraServiceId, p]));
    const offered = extras.filter((service) => {
      if (isMandatoryExtra(service)) return true;
      const pref = prefById.get(service.id);
      if (isCrossBorderExtra(service)) return Boolean(pref?.enabled || pref?.forbidden);
      if (!fleet) return true;
      return partnerServiceAdded(service, pref, fleet.usedOnCar(service));
    });
    const initialExtrasCatalog = await scopeExtrasToPartner(
      offered,
      partnerId,
      company?.deliveryCountryIso2s,
    );
    const initialExtraPrefs: CarFormExtraPref[] | undefined = fleet
      ? initialExtrasCatalog.map((service) => ({
          service: { id: service.id, slug: service.slug },
          ...partnerCabinetDefaults(service, prefById.get(service.id), fleet.usedOnCar(service)),
        }))
      : undefined;
    return {
      initialDeliveryCatalog: delivery,
      initialExtrasCatalog,
      initialExtraPrefs,
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
