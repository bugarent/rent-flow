import { parseCarDetails } from "@/lib/cars/car-details";
import { normalizeLocationCode } from "@/lib/catalog/search-places";

type ScopeLocation = { id: string; iata?: string | null; airportId?: string | null };

/**
 * Drop pick-up places that are not in the partner's approved locations, so a listing
 * can never advertise delivery to a place the partner was not approved for.
 * An empty catalog (could not be loaded) leaves the description untouched.
 */
export function scopePickupPlacesInDescription<T extends string | null | undefined>(
  description: T,
  catalog: ScopeLocation[],
): T {
  if (!description || !catalog.length) return description;
  const details = parseCarDetails(description);
  const places = details?.pickupPlaces;
  if (!details || !Array.isArray(places)) return description;

  const allowed = new Set(
    catalog
      .flatMap((loc) => [loc.id, loc.iata, loc.airportId])
      .map((value) => normalizeLocationCode(value || "").toUpperCase())
      .filter(Boolean),
  );
  const kept = places.filter((place) => {
    const id =
      place && typeof place === "object"
        ? String((place as { deliveryLocationId?: unknown }).deliveryLocationId || "")
        : "";
    return Boolean(id) && allowed.has(normalizeLocationCode(id).toUpperCase());
  });
  if (kept.length === places.length) return description;

  const blob = `<!--car-details:${JSON.stringify({ ...details, pickupPlaces: kept })}-->`;
  return description.replace(/<!--car-details:[\s\S]*?-->/, () => blob) as T;
}
