import { normalizeLocationCode } from "@/lib/catalog/search-places";
import type { CrossBorderReturnMap } from "@/lib/catalog/cross-border-returns";

/** One priced pickup → other-country return, saved on the Delivery page. */
export type CrossBorderRoute = {
  id: string;
  pickupLocationId: string;
  returnLocationId: string;
  /** EUR. 0 means the partner set this crossing as free. */
  priceEur: number;
};

/** Search codes for one saved route. The first code is the public place code. */
export type CrossBorderRouteView = {
  pickup: string;
  dropoff: string;
  pickupCodes: string[];
  returnCodes: string[];
  priceEur: number;
};

function norm(raw: string | null | undefined) {
  return normalizeLocationCode(String(raw || "")).toUpperCase();
}

export function routeMatches(
  route: Pick<CrossBorderRouteView, "pickupCodes" | "returnCodes">,
  pickup: string | null | undefined,
  dropoff: string | null | undefined,
): boolean {
  const from = norm(pickup);
  const to = norm(dropoff);
  if (!from || !to || from === to) return false;
  return route.pickupCodes.some((code) => norm(code) === from) && route.returnCodes.some((code) => norm(code) === to);
}

/** The partner's price for this pair, or null when they did not save one. */
export function crossBorderRouteFee(
  routes: Array<Pick<CrossBorderRouteView, "pickupCodes" | "returnCodes" | "priceEur">> | undefined,
  pickup: string | null | undefined,
  dropoff: string | null | undefined,
): number | null {
  if (!routes?.length) return null;
  const hit = routes.find((route) => routeMatches(route, pickup, dropoff));
  if (!hit) return null;
  const price = Number(hit.priceEur);
  return Number.isFinite(price) ? Math.max(0, price) : 0;
}

/** Homepage return list: each saved pickup can return at its other-country place. */
export function returnMapFromRoutes(partners: Array<{ routes: CrossBorderRouteView[] }>): CrossBorderReturnMap {
  const links = new Map<string, Set<string>>();
  for (const partner of partners) {
    for (const route of partner.routes) {
      const target = norm(route.dropoff || route.returnCodes[0]);
      if (!target) continue;
      for (const from of route.pickupCodes) {
        const key = norm(from);
        if (!key || key === target) continue;
        const set = links.get(key) ?? new Set<string>();
        set.add(target);
        links.set(key, set);
      }
    }
  }
  const out: CrossBorderReturnMap = {};
  for (const [key, set] of links) {
    const list = [...set].filter((code) => code !== key).sort();
    if (list.length) out[key] = list;
  }
  return out;
}
