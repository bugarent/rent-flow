import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  listDeliveryLocations,
  listPartnerScopedDeliveryLocations,
} from "@/lib/server/delivery-locations";

/**
 * Partner pick-up/return catalog. When the scoped list is empty but personal-info
 * has saved location ids, resolves those existing locations (no create-on-read).
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

  try {
    const all = await listDeliveryLocations({ activeOnly: false });
    const byId = new Map(all.map((l) => [l.id, l]));
    const byCode = new Map(all.map((l) => [normalizeLocationCode(l.iata).toUpperCase(), l]));
    const out: DeliveryLocationView[] = [];
    const seen = new Set<string>();
    for (const id of deliveryLocationIds) {
      const hit = byId.get(id) || byCode.get(normalizeLocationCode(id).toUpperCase());
      if (!hit || seen.has(hit.id)) continue;
      seen.add(hit.id);
      out.push(hit);
    }
    return out;
  } catch {
    return catalog;
  }
}
