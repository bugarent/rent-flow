import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { isMandatoryExtra, type ExtraServicePricing } from "@/lib/extras/pricing";
import { withTplPartnerChoice } from "@/lib/extras/tpl-partner-choice";
import { partnerStatusLocked } from "@/lib/extras/partner-service-choice";
import { partnerMayToggleTpl } from "@/lib/server/tpl-partner-choice-store";
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
  initialMinRentalDays?: 1 | 2;
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
    // Same country source as Additional Services / extras-prefs (not company override).
    const canToggleTpl = await partnerMayToggleTpl(partnerId);
    const catalog = withTplPartnerChoice(extras, canToggleTpl);
    const prefById = new Map(prefs.map((p) => [p.extraServiceId, p]));
    const prefBySlug = new Map<string, (typeof prefs)[number]>();
    for (const pref of prefs) {
      const match = catalog.find((service) => service.id === pref.extraServiceId);
      if (match?.slug) prefBySlug.set(match.slug, pref);
    }
    const offered = catalog.filter((service) => {
      const pref = prefById.get(service.id) || (service.slug ? prefBySlug.get(service.slug) : undefined);
      // Cabinet Off/removed — never put on car ads, including optional TPL.
      if (
        pref &&
        !partnerStatusLocked(service) &&
        (pref.added === false || (!pref.forbidden && pref.enabled === false))
      ) {
        return false;
      }
      if (partnerStatusLocked(service)) return true;
      if (isCrossBorderExtra(service)) return Boolean(pref?.enabled || pref?.forbidden);
      if (!fleet) return true;
      if (!partnerServiceAdded(service, pref, fleet.usedOnCar(service))) return false;
      return true;
    });
    const initialExtrasCatalog = await scopeExtrasToPartner(
      offered,
      partnerId,
      company?.deliveryCountryIso2s,
    );
    // Full cabinet state (incl. Off) so client refresh cannot resurrect Off insurance as mandatory.
    const initialExtraPrefs: CarFormExtraPref[] | undefined = fleet
      ? catalog.map((service) => {
          const pref = prefById.get(service.id) || (service.slug ? prefBySlug.get(service.slug) : undefined);
          return {
            service: { id: service.id, slug: service.slug },
            ...partnerCabinetDefaults(service, pref, fleet.usedOnCar(service)),
            ...(pref?.carIds ? { carIds: pref.carIds } : {}),
          };
        })
      : undefined;
    return {
      initialDeliveryCatalog: delivery,
      initialExtrasCatalog,
      initialExtraPrefs,
      initialTariffs: company?.tariffs?.length ? company.tariffs : undefined,
      initialMinRentalDays: company?.minRentalDays === 2 ? 2 : 1,
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
