import "server-only";

import { buildCrossBorderReturnMap } from "@/lib/catalog/cross-border-returns";
import { crossBorderReturnCache } from "@/lib/server/cross-border-return-cache";

function partnerKey(raw: string) {
  return String(raw || "").trim().replace(/^file-partner-/, "");
}

function partnerAliases(partnerId: string) {
  const bare = partnerKey(partnerId);
  return [...new Set([partnerId.trim(), bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
}

/**
 * Return places outside the pickup country: locations a partner switched ON
 * on the Delivery page, when that partner also switched ON the pickup place
 * and has a live car.
 */
export async function getCrossBorderReturnPlaces() {
  const hit = crossBorderReturnCache.get();
  if (hit) return hit;

  try {
    const [{ approvedPartnerPlaceGroups }, { readPartnerDeliveryPrefsMap }, { listDeliveryLocations }, { partnerKeysWithLiveCars }] =
      await Promise.all([
        import("@/lib/server/partner-search-coverage"),
        import("@/lib/server/partner-delivery-prefs-store"),
        import("@/lib/server/delivery-locations"),
        import("@/lib/server/search-place-coverage"),
      ]);

    const [groups, locations, live] = await Promise.all([
      approvedPartnerPlaceGroups(),
      listDeliveryLocations({ activeOnly: true }),
      partnerKeysWithLiveCars(),
    ]);
    const serving = groups.filter((group) => live.has(partnerKey(group.partnerId)));
    const prefsByPartner = await readPartnerDeliveryPrefsMap(
      serving.flatMap((group) => partnerAliases(group.partnerId)),
    ).catch(() => new Map<string, Array<{ deliveryLocationId: string; enabled: boolean }>>());

    const partners = serving.map((group) => {
      const prefs =
        partnerAliases(group.partnerId)
          .map((id) => prefsByPartner.get(id))
          .find((list) => list?.length) ?? [];
      return {
        cabinetCodes: group.codes,
        enabledIds: prefs.filter((pref) => pref.enabled !== false).map((pref) => pref.deliveryLocationId),
      };
    });

    const map = buildCrossBorderReturnMap(partners, locations);
    crossBorderReturnCache.set(map);
    return map;
  } catch (error) {
    console.warn("[cross-border-returns] unavailable", error);
    return {};
  }
}
