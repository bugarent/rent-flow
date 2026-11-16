import "server-only";

import { listExtraServices } from "@/lib/server/extras-store";
import {
  readAllPartnerExtraPrefs,
  writePartnerExtraPrefs,
  type PartnerExtraPref,
} from "@/lib/server/partner-extras-prefs-store";
import { listFileCars } from "@/lib/server/partner-cars-store";
import { syncListingExtraPrices } from "@/lib/server/sync-listing-extra-prices";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { clearSearchCatalog } from "@/lib/server/search-catalog";
import { clearPublicCarPayloadCache } from "@/lib/server/public-car-payload";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

function normalizePrefs(prefs: PartnerExtraPref[]): PartnerExtraPref[] {
  return prefs.map((pref) => {
    const forbidden = Boolean(pref.forbidden);
    const enabled = forbidden ? true : Boolean(pref.enabled);
    const emptyCars = Array.isArray(pref.carIds) && pref.carIds.length === 0;
    // Off/forbid with [] must apply fleet-wide (omit carIds).
    if (emptyCars && (forbidden || !enabled)) {
      const { carIds: _drop, ...rest } = pref;
      return { ...rest, enabled, forbidden };
    }
    return { ...pref, enabled, forbidden };
  });
}

async function carIdsForPartner(partnerId: string): Promise<string[]> {
  const ids = new Set<string>();
  const bare = partnerId.replace(/^file-partner-/, "");
  const candidates = [...new Set([partnerId, bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
  try {
    const rows = await prisma.car.findMany({
      where: { partnerId: { in: candidates } },
      select: { id: true },
    });
    for (const row of rows) ids.add(row.id);
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  try {
    const files = await listFileCars();
    for (const car of files) {
      const pid = String(car.partnerId || "");
      if (candidates.includes(pid) || candidates.includes(pid.replace(/^file-partner-/, ""))) {
        ids.add(car.id);
      }
    }
  } catch {
    /* optional */
  }
  return [...ids];
}

/**
 * Normalize every partner's cabinet extras prefs and stamp prices/off/forbid
 * onto all of their car listings (DB + file cars). Safe to re-run.
 */
export async function resyncAllPartnerListingExtras(): Promise<{
  partners: number;
  cars: number;
  prefsNormalized: number;
}> {
  const all = await readAllPartnerExtraPrefs();
  const catalog = await listExtraServices({ activeOnly: false });
  const catalogById = new Map(catalog.map((service) => [service.id, service]));
  let partners = 0;
  let cars = 0;
  let prefsNormalized = 0;

  for (const [partnerId, prefs] of Object.entries(all)) {
    if (!prefs.length) continue;
    const before = JSON.stringify(prefs);
    const normalized = normalizePrefs(prefs);
    if (JSON.stringify(normalized) !== before) prefsNormalized += 1;
    const saved = await writePartnerExtraPrefs(partnerId, normalized);
    const carIds = await carIdsForPartner(partnerId);
    if (!carIds.length) {
      partners += 1;
      continue;
    }
    await syncListingExtraPrices({
      carIds,
      partnerId,
      userId: partnerId,
      email: null,
      remoderate: false,
      prices: saved.map((pref) => {
        const service = catalogById.get(pref.extraServiceId);
        const forbidden = Boolean(pref.forbidden);
        const enabled = forbidden ? true : Boolean(pref.enabled);
        return {
          extraServiceId: pref.extraServiceId,
          slug: service?.slug,
          name: service?.name,
          priceEur: forbidden || !enabled ? 0 : Number(pref.priceEur) || 0,
          enabled,
          forbidden,
          ...(pref.carIds ? { carIds: pref.carIds } : {}),
        };
      }),
    });
    partners += 1;
    cars += carIds.length;
  }

  clearSearchCatalog();
  clearPublicCarPayloadCache();
  revalidatePublishedContent();
  return { partners, cars, prefsNormalized };
}
