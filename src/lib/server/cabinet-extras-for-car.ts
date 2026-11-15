import "server-only";

import { partnerExtraPrefAppliesToCar } from "@/lib/extras/partner-extra-pref";
import { listExtraServices } from "@/lib/server/extras-store";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";

export type CarCabinetExtra = {
  extraServiceId: string;
  slug: string;
  enabled: boolean;
  forbidden: boolean;
  priceEur: number;
};

/** Cabinet rows that apply to this listing. Off and forbid are explicit. */
export async function cabinetExtrasForCar(partnerId: string, carId: string): Promise<CarCabinetExtra[]> {
  const id = String(partnerId || "").trim();
  if (!id || !String(carId || "").trim()) return [];
  const [prefs, catalog] = await Promise.all([
    readPartnerExtraPrefs(id),
    listExtraServices({ activeOnly: false }),
  ]);
  const slugById = new Map(catalog.map((service) => [service.id, String(service.slug || "")]));
  return prefs
    .filter((pref) =>
      partnerExtraPrefAppliesToCar(
        { carIds: pref.carIds, enabled: pref.enabled, forbidden: pref.forbidden },
        carId,
      ),
    )
    .map((pref) => {
      const forbidden = Boolean(pref.forbidden);
      const enabled = forbidden ? true : Boolean(pref.enabled);
      return {
        extraServiceId: pref.extraServiceId,
        slug: slugById.get(pref.extraServiceId) || "",
        enabled,
        forbidden,
        priceEur: forbidden || !enabled ? 0 : Number(pref.priceEur) || 0,
      };
    });
}
