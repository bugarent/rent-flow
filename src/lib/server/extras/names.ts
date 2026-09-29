import "server-only";

import { pickServiceLabel } from "@/lib/extras/service-label";
import { listAllPartnerCustomExtras } from "@/lib/server/partner-custom-extras-store";
import { listExtraServices } from "./list";

/** Catalog and partner-custom service titles, keyed by extra id. */
export async function extraServiceNameById(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const catalog = await listExtraServices({ activeOnly: false });
    for (const row of catalog) {
      const name = pickServiceLabel(row.name);
      if (name) map.set(row.id, name);
    }
  } catch {
    /* catalog optional when the store is unavailable */
  }
  try {
    const customs = await listAllPartnerCustomExtras();
    for (const row of customs) {
      const name = pickServiceLabel(row.name);
      if (name && !map.has(row.id)) map.set(row.id, name);
    }
  } catch {
    /* custom extras optional */
  }
  return map;
}
