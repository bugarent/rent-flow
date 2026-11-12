import "server-only";

import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  crossBorderRouteFee,
  returnMapFromRoutes,
  type CrossBorderRoute,
  type CrossBorderRouteView,
} from "@/lib/delivery/cross-border-routes";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { createTtlCache } from "@/lib/server/ttl-cache";

export type CrossBorderRouteIndex = {
  byPartner: Map<string, CrossBorderRouteView[]>;
  returnMap: ReturnType<typeof returnMapFromRoutes>;
  fee(partnerId: string, pickup: string, dropoff: string): number | null;
  allows(partnerId: string, pickup: string, dropoff: string): boolean;
  /** Bare partner ids that priced this pickup → return pair. */
  partnerIds(pickup: string, dropoff: string): string[];
  routesFor(partnerId: string): CrossBorderRouteView[];
};

const cache = createTtlCache<CrossBorderRouteIndex>(15_000);

export function clearCrossBorderRouteIndex() {
  cache.clear();
}

function norm(raw: string | null | undefined) {
  return normalizeLocationCode(String(raw || "")).toUpperCase();
}

function bareId(partnerId: string) {
  return partnerId.trim().replace(/^file-partner-/, "");
}

function publicCode(loc: DeliveryLocationView): string {
  const catalog =
    findSearchPlace(loc.iata) ||
    findSearchPlace(loc.id) ||
    (loc.airportId ? findSearchPlace(loc.airportId) : undefined);
  return norm(catalog?.code || loc.iata || loc.id);
}

function codesFor(loc: DeliveryLocationView): string[] {
  const set = new Set<string>();
  for (const value of [publicCode(loc), loc.iata, loc.id, loc.airportId]) {
    const key = norm(value);
    if (key) set.add(key);
  }
  return [...set];
}

function locationById(locations: DeliveryLocationView[]) {
  const byId = new Map<string, DeliveryLocationView>();
  for (const loc of locations) {
    if (loc.isActive === false) continue;
    byId.set(loc.id, loc);
    const code = norm(loc.iata);
    if (code && !byId.has(code)) byId.set(code, loc);
  }
  return byId;
}

function enabledIds(prefs: Array<{ deliveryLocationId: string; enabled: boolean }> | undefined) {
  const ids = new Set<string>();
  for (const pref of prefs || []) {
    if (pref.enabled === false) continue;
    const id = String(pref.deliveryLocationId || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

function viewsFor(
  routes: CrossBorderRoute[],
  places: Map<string, DeliveryLocationView>,
  on: Set<string>,
): CrossBorderRouteView[] {
  const out: CrossBorderRouteView[] = [];
  const seen = new Set<string>();
  for (const route of routes) {
    if (!on.has(route.pickupLocationId) || !on.has(route.returnLocationId)) continue;
    const pickup = places.get(route.pickupLocationId);
    const dropoff = places.get(route.returnLocationId);
    if (!pickup || !dropoff) continue;
    const fromCountry = (pickup.countryIso2 || "").toUpperCase();
    const toCountry = (dropoff.countryIso2 || "").toUpperCase();
    if (!fromCountry || !toCountry || fromCountry === toCountry) continue;
    const pickupCode = publicCode(pickup);
    const dropoffCode = publicCode(dropoff);
    if (!pickupCode || !dropoffCode || pickupCode === dropoffCode) continue;
    const key = `${pickupCode}>${dropoffCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      pickup: pickupCode,
      dropoff: dropoffCode,
      pickupCodes: codesFor(pickup),
      returnCodes: codesFor(dropoff),
      priceEur: route.priceEur,
    });
  }
  return out;
}

function buildIndex(
  byPartner: Map<string, CrossBorderRouteView[]>,
): CrossBorderRouteIndex {
  const partners = [...byPartner.entries()]
    .filter(([id]) => !id.startsWith("file-partner-"))
    .map(([, routes]) => ({ routes }));
  const returnMap = returnMapFromRoutes(partners);
  const routesFor = (partnerId: string) => {
    const bare = bareId(partnerId);
    return byPartner.get(bare) || byPartner.get(partnerId) || byPartner.get(`file-partner-${bare}`) || [];
  };
  return {
    byPartner,
    returnMap,
    routesFor,
    fee(partnerId, pickup, dropoff) {
      return crossBorderRouteFee(routesFor(partnerId), pickup, dropoff);
    },
    allows(partnerId, pickup, dropoff) {
      return this.fee(partnerId, pickup, dropoff) != null;
    },
    partnerIds(pickup, dropoff) {
      const ids: string[] = [];
      for (const [id, routes] of byPartner) {
        if (id.startsWith("file-partner-")) continue;
        if (crossBorderRouteFee(routes, pickup, dropoff) != null) ids.push(id);
      }
      return ids;
    },
  };
}

export function emptyCrossBorderRouteIndex(): CrossBorderRouteIndex {
  return buildIndex(new Map());
}

export async function loadCrossBorderRouteIndex(): Promise<CrossBorderRouteIndex> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const [
      { readAllCrossBorderRoutes },
      { readAllPartnerDeliveryPrefs },
      { listCrossBorderEnabledPartnerIds },
      { listDeliveryLocations },
      { partnerKeysWithLiveCars },
    ] = await Promise.all([
      import("@/lib/server/partner-cross-border-routes-store"),
      import("@/lib/server/partner-delivery-prefs-store"),
      import("@/lib/server/partner-extras-prefs-store"),
      import("@/lib/server/delivery-locations"),
      import("@/lib/server/search-place-coverage"),
    ]);
    const [routesByPartner, prefsByPartner, enabledPartners, locations, live] = await Promise.all([
      readAllCrossBorderRoutes(),
      readAllPartnerDeliveryPrefs(),
      listCrossBorderEnabledPartnerIds(),
      listDeliveryLocations({ activeOnly: true }),
      partnerKeysWithLiveCars(),
    ]);
    const places = locationById(locations);
    const byPartner = new Map<string, CrossBorderRouteView[]>();
    for (const [partnerId, routes] of routesByPartner) {
      const bare = bareId(partnerId);
      if (!bare || !enabledPartners.has(bare) || !live.has(bare)) continue;
      const prefs =
        prefsByPartner.get(partnerId) ||
        prefsByPartner.get(bare) ||
        prefsByPartner.get(`file-partner-${bare}`) ||
        [];
      const views = viewsFor(routes, places, enabledIds(prefs));
      if (!views.length) continue;
      byPartner.set(bare, views);
      byPartner.set(`file-partner-${bare}`, views);
    }
    const index = buildIndex(byPartner);
    cache.set(index);
    return index;
  } catch (error) {
    console.warn("[cross-border-routes] index unavailable", error);
    const stale = cache.peek();
    return stale ?? emptyCrossBorderRouteIndex();
  }
}

export async function crossBorderFeeFor(
  partnerId: string,
  pickup: string,
  dropoff: string,
): Promise<number | null> {
  if (!partnerId || !pickup || !dropoff) return null;
  const index = await loadCrossBorderRouteIndex();
  return index.fee(partnerId, pickup, dropoff);
}
