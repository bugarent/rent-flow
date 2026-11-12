import "server-only";

import { loadCrossBorderRouteIndex } from "@/lib/server/cross-border-route-index";

/**
 * Return places outside the pickup country: pairs the partner saved on the
 * Delivery page after switching on border crossing, while they have a live car.
 */
export async function getCrossBorderReturnPlaces() {
  try {
    const index = await loadCrossBorderRouteIndex();
    return index.returnMap;
  } catch (error) {
    console.warn("[cross-border-returns] unavailable", error);
    return {};
  }
}
