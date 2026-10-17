import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isSyntheticDeliveryId } from "@/lib/delivery/pricing";

/**
 * Pick-up places stored in a listing's description. The listing form no longer edits
 * them (places and fees come from the partner's Delivery page); they are kept so
 * saving a listing does not change its stored shape.
 */
export type PickupPlaceKind = "city" | "airport" | "office";

export type PickupPlaceRow = {
  id: string;
  cityKey: string;
  cityLabel: string;
  placeKind: PickupPlaceKind;
  placeLabel: string;
  /** Real DeliveryLocation id when airport/city; synthetic otherwise */
  deliveryLocationId: string;
  enabled: boolean;
  priceEur: string;
  freeAfterDays: string;
  travelHours: string;
  travelMinutes: string;
};

function cityNameFromLoc(loc: DeliveryLocationView): string {
  if (loc.cityName?.trim()) return loc.cityName.trim();
  const beforeParen = loc.label.split("(")[0]?.trim();
  if (beforeParen) return beforeParen;
  return loc.iata;
}

function cityKey(iso2: string, name: string) {
  return `${iso2.toUpperCase()}::${name.trim().toLowerCase()}`;
}

/** Rebuild the stored pick-up rows of a listing from its saved location ids. */
export function buildPlaceRowsForLocations(
  catalog: DeliveryLocationView[],
  selectedIds: string[],
  previous: PickupPlaceRow[],
): PickupPlaceRow[] {
  const prevById = new Map(previous.map((p) => [p.deliveryLocationId || p.id, p]));
  const byId = new Map(catalog.map((l) => [l.id, l]));
  const rows: PickupPlaceRow[] = [];
  for (const id of selectedIds) {
    const loc = byId.get(id);
    if (!loc) continue;
    const city = cityNameFromLoc(loc);
    const prev = prevById.get(id);
    rows.push({
      enabled: true,
      priceEur: "0",
      ...prev,
      id,
      cityKey: cityKey(loc.countryIso2 || "XX", city),
      cityLabel: city,
      placeKind: loc.kind === "city" ? "city" : "airport",
      placeLabel: loc.label,
      deliveryLocationId: loc.id,
      freeAfterDays: "0",
      travelHours: "0",
      travelMinutes: "0",
    });
  }
  return rows;
}

export function pickupPlacesToDeliveryPayload(places: PickupPlaceRow[]) {
  return places
    .filter((p) => p.enabled && !isSyntheticDeliveryId(p.deliveryLocationId))
    .map((p) => ({
      deliveryLocationId: p.deliveryLocationId,
      enabled: true,
      priceEur: 0,
      freeAfterDays: 0,
      travelTimeMinutes: 0,
      placeKind: p.placeKind,
      cityKey: p.cityKey,
      cityLabel: p.cityLabel,
      placeLabel: p.placeLabel,
    }));
}
