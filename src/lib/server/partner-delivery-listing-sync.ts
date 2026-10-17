import "server-only";

import {
  capFreeAfterDays,
  normalizeDeliveryPrice,
  type DeliveryLocationView,
  type ResolvedDeliveryRow,
} from "@/lib/delivery/pricing";
import {
  addMissingPartnerDeliveryPrefs,
  readPartnerDeliveryPrefs,
  type PartnerDeliveryPref,
} from "@/lib/server/partner-delivery-prefs-store";

type LocationLimits = Pick<DeliveryLocationView, "id" | "maxDeliveryPriceEur" | "maxFreeAfterDays">;

/** Delivery-page values for one location, within the admin limits of that location. */
function listingValues(pref: PartnerDeliveryPref, loc: LocationLimits | undefined) {
  const priceEur = loc
    ? normalizeDeliveryPrice(loc.maxDeliveryPriceEur, pref.priceEur).priceEur
    : Math.max(0, Number(pref.priceEur) || 0);
  const freeAfterDays = capFreeAfterDays(loc?.maxFreeAfterDays, pref.freeAfterDays).freeAfterDays;
  return { priceEur, freeAfterDays, travelTimeMinutes: Math.max(0, pref.travelTimeMinutes || 0) };
}

async function prefsFor(partnerId: string): Promise<PartnerDeliveryPref[]> {
  let prefs = await readPartnerDeliveryPrefs(partnerId);
  if (!prefs.length && partnerId.startsWith("file-partner-")) {
    prefs = await readPartnerDeliveryPrefs(partnerId.slice("file-partner-".length));
  }
  return prefs.filter((p) => p.enabled !== false);
}

/**
 * A listing's delivery rows carry the partner's Delivery-page prices, so the car
 * total includes the right fee even before the prices are overlaid at search time.
 */
export async function withPartnerDeliveryPrices(
  partnerId: string,
  rows: ResolvedDeliveryRow[],
  catalog: LocationLimits[],
): Promise<ResolvedDeliveryRow[]> {
  if (!partnerId || !rows.length) return rows;
  let prefs: PartnerDeliveryPref[];
  try {
    prefs = await prefsFor(partnerId);
  } catch (error) {
    console.warn("[delivery-sync] listing prices kept as sent", error);
    return rows;
  }
  const byId = new Map(prefs.map((p) => [p.deliveryLocationId, p]));
  const locById = new Map(catalog.map((l) => [l.id, l]));
  return rows.map((row) => {
    const pref = byId.get(row.deliveryLocationId);
    return pref ? { ...row, ...listingValues(pref, locById.get(row.deliveryLocationId)) } : row;
  });
}

/**
 * The Delivery page shows personal-info places without a saved row as ON (price 0).
 * Store exactly those values so every listing is offered at what the partner sees there.
 */
export async function storeShownDeliveryPlaces(partnerId: string): Promise<number> {
  if (!partnerId) return 0;
  const { listPartnerCountryDeliveryLocations } = await import("@/lib/server/delivery-locations");
  const [{ locations, selectedIds }, prefs] = await Promise.all([
    listPartnerCountryDeliveryLocations(partnerId),
    readPartnerDeliveryPrefs(partnerId),
  ]);
  const known = new Set(prefs.map((p) => p.deliveryLocationId));
  const locById = new Map(locations.map((l) => [l.id, l]));
  const missing = selectedIds.filter((id) => locById.has(id) && !known.has(id));
  if (!missing.length) return 0;
  const added = await addMissingPartnerDeliveryPrefs(
    partnerId,
    missing.map((id) => {
      const loc = locById.get(id)!;
      return {
        deliveryLocationId: id,
        enabled: true,
        priceEur: normalizeDeliveryPrice(loc.maxDeliveryPriceEur, 0).priceEur,
        freeAfterDays: capFreeAfterDays(loc.maxFreeAfterDays, 0).freeAfterDays,
        travelTimeMinutes: 0,
      };
    }),
  );
  if (added) {
    const [{ clearPublicCarPayloadCache }, { revalidatePublishedContent }] = await Promise.all([
      import("@/lib/server/public-car-payload"),
      import("@/lib/server/revalidate-public-content"),
    ]);
    clearPublicCarPayloadCache();
    revalidatePublishedContent();
  }
  return added;
}

/**
 * Copy saved Delivery-page prices onto every listing of the partner that offers
 * those locations. Only price, free-after days and travel time change; which
 * places a listing offers stays exactly as the partner chose on the listing.
 */
export async function syncPartnerDeliveryPricesToListings(
  partnerId: string,
  prefs: PartnerDeliveryPref[],
  catalog: LocationLimits[],
): Promise<number> {
  const locById = new Map(catalog.map((l) => [l.id, l]));
  const targets = prefs.filter((p) => p.enabled !== false && locById.has(p.deliveryLocationId));
  if (!partnerId || !targets.length) return 0;

  const { prisma } = await import("@/lib/prisma");
  let updated = 0;
  for (const pref of targets) {
    try {
      const result = await prisma.carDeliveryPrice.updateMany({
        where: { deliveryLocationId: pref.deliveryLocationId, car: { partnerId } },
        data: listingValues(pref, locById.get(pref.deliveryLocationId)),
      });
      updated += result.count;
    } catch (error) {
      console.warn("[delivery-sync] listing rows not updated", pref.deliveryLocationId, error);
    }
  }

  const [{ clearPublicCarPayloadCache }, { revalidatePublishedContent }] = await Promise.all([
    import("@/lib/server/public-car-payload"),
    import("@/lib/server/revalidate-public-content"),
  ]);
  clearPublicCarPayloadCache();
  revalidatePublishedContent();
  return updated;
}
