import "server-only";

import { partnerCabinetDefaults } from "@/lib/extras/partner-service-choice";
import type { ExtraServicePricing } from "@/lib/extras/pricing";
import { withTplPartnerChoice } from "@/lib/extras/tpl-partner-choice";
import { listExtraServices } from "@/lib/server/extras-store";
import { listPartnerCustomExtrasAsPricing } from "@/lib/server/partner-custom-extras-store";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";
import { partnerMayToggleTpl } from "@/lib/server/tpl-partner-choice-store";

export type CarCabinetExtra = {
  extraServiceId: string;
  slug: string;
  added: boolean;
  enabled: boolean;
  forbidden: boolean;
  priceEur: number;
  carIds?: string[];
};

/** Every cabinet row for this partner, in the same shape the equipment page saves. */
export async function cabinetExtrasForCar(partnerId: string, carId: string): Promise<CarCabinetExtra[]> {
  const id = String(partnerId || "").trim();
  if (!id || !String(carId || "").trim()) return [];
  const [prefs, catalog, customs, canToggleTpl] = await Promise.all([
    readPartnerExtraPrefs(id),
    listExtraServices({ activeOnly: false }),
    listPartnerCustomExtrasAsPricing(id, { activeOnly: false }).catch(() => [] as ExtraServicePricing[]),
    partnerMayToggleTpl(id),
  ]);
  const byId = new Map(
    withTplPartnerChoice(catalog, canToggleTpl).map((service) => [service.id, service]),
  );
  for (const custom of customs) {
    if (!byId.has(custom.id)) byId.set(custom.id, custom);
  }
  return prefs.map((pref) => {
    const service = byId.get(pref.extraServiceId);
    const defaults = service
      ? partnerCabinetDefaults(service, pref, false)
      : {
          added: pref.added !== false,
          enabled: Boolean(pref.forbidden) || Boolean(pref.enabled),
          forbidden: Boolean(pref.forbidden),
          priceEur: Number(pref.priceEur) || 0,
        };
    return {
      extraServiceId: pref.extraServiceId,
      slug: String(service?.slug || ""),
      added: defaults.added,
      enabled: defaults.enabled,
      forbidden: defaults.forbidden,
      priceEur: defaults.forbidden ? 0 : defaults.priceEur,
      ...(pref.carIds ? { carIds: pref.carIds } : {}),
    };
  });
}
