import "server-only";

import { isCoreTplSlug } from "@/lib/extras/tpl-partner-choice";
import { listExtraServices } from "@/lib/server/extras/list";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";

/**
 * True when this partner's cabinet has core TPL set to Off.
 * Used by public hydrate and car-save so Off always wins over force-keep / re-inject.
 */
export async function partnerCoreTplIsOff(partnerId: string | null | undefined): Promise<boolean> {
  const pid = String(partnerId || "").trim();
  if (!pid) return false;
  try {
    const candidateIds = [pid];
    if (pid.startsWith("file-partner-")) {
      const stripped = pid.replace(/^file-partner-/, "");
      if (stripped) candidateIds.push(stripped);
    }
    if (!candidateIds.includes(LOCAL_PARTNER_ID)) candidateIds.push(LOCAL_PARTNER_ID);

    let prefs: Array<{ extraServiceId: string; enabled: boolean }> = [];
    for (const candidate of candidateIds) {
      prefs = await readPartnerExtraPrefs(candidate);
      if (prefs.length) break;
    }
    if (!prefs.length) return false;

    const catalog = await listExtraServices({ activeOnly: false });
    const tplIds = new Set(
      catalog.filter((service) => isCoreTplSlug(service.slug)).map((service) => service.id),
    );
    const slugById = new Map(catalog.map((service) => [service.id, service.slug]));

    return prefs.some((pref) => {
      if (pref.enabled !== false) return false;
      if (tplIds.has(pref.extraServiceId)) return true;
      return isCoreTplSlug(slugById.get(pref.extraServiceId) || "");
    });
  } catch {
    return false;
  }
}
