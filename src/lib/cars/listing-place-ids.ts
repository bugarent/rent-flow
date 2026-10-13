import { parseCarDetails } from "@/lib/cars/car-details";

/** Location ids a listing offers on its pick-up / drop-off list (city places included). */
export function listingPickupPlaceIds(description: string | null | undefined): Set<string> {
  const ids = new Set<string>();
  const places = parseCarDetails(description)?.pickupPlaces;
  if (!Array.isArray(places)) return ids;
  for (const place of places) {
    if (!place || typeof place !== "object") continue;
    const id = String((place as { deliveryLocationId?: unknown }).deliveryLocationId || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}
