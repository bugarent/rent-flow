import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  listDeliveryLocations,
  listPartnerScopedDeliveryLocations,
} from "@/lib/server/delivery-locations";
import { readPartnerDeliveryPrefs } from "@/lib/server/partner-delivery-prefs-store";

/**
 * Partner pick-up/return catalog for car add/edit.
 * Only locations toggled ON in Delivery settings (prefs.enabled / synced ids).
 */
export async function loadPartnerDeliveryCatalog(
  partnerId: string,
  deliveryLocationIds: string[] = [],
): Promise<DeliveryLocationView[]> {
  let catalog: DeliveryLocationView[] = [];
  try {
    catalog = await listPartnerScopedDeliveryLocations(partnerId);
  } catch {
    catalog = [];
  }
  if (catalog.length || !deliveryLocationIds.length) return catalog;

  // Fallback: resolve personal-info ids, then drop any that are explicitly OFF in prefs.
  try {
    const [all, prefs] = await Promise.all([
      listDeliveryLocations({ activeOnly: false }),
      readPartnerDeliveryPrefs(partnerId).catch(() => []),
    ]);
    const prefById = new Map(prefs.map((p) => [p.deliveryLocationId, p]));
    const byId = new Map(all.map((l) => [l.id, l]));
    const byCode = new Map(all.map((l) => [normalizeLocationCode(l.iata).toUpperCase(), l]));
    const out: DeliveryLocationView[] = [];
    const seen = new Set<string>();
    for (const id of deliveryLocationIds) {
      const hit = byId.get(id) || byCode.get(normalizeLocationCode(id).toUpperCase());
      if (!hit?.isActive || seen.has(hit.id)) continue;
      const pref = prefById.get(hit.id);
      if (pref && pref.enabled === false) continue;
      seen.add(hit.id);
      out.push(hit);
    }
    return out;
  } catch {
    return catalog;
  }
}
