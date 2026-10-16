import "server-only";

import type { Prisma } from "@prisma/client";
import { parseCarDetails } from "@/lib/cars/car-details";
import { listingPickupPlaceIds } from "@/lib/cars/listing-place-ids";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";

/** Resolve a search pickup/dropoff code to DeliveryLocation ids (id + iata aliases). */
export async function deliveryLocationIdsForPlaceCode(placeCode: string): Promise<string[]> {
  const code = normalizeLocationCode(placeCode).toUpperCase();
  if (!code) return [];
  const all = await listDeliveryLocations({ activeOnly: false });
  const ids = new Set<string>();
  for (const loc of all) {
    const keys = [loc.id, loc.iata, loc.airportId]
      .map((v) => normalizeLocationCode(v || "").toUpperCase())
      .filter(Boolean);
    if (keys.includes(code)) ids.add(loc.id);
  }
  return [...ids];
}

/**
 * Prisma filter: car must have an active CarDeliveryPrice row for this place.
 * Used by /api/cars and /cars so unselected locations never match.
 */
export async function carAssignedToPlaceWhere(
  placeCode: string | undefined | null,
): Promise<Prisma.CarWhereInput | null> {
  const code = String(placeCode || "").trim();
  if (!code) return null;
  const locationIds = await deliveryLocationIdsForPlaceCode(code);
  if (!locationIds.length) {
    // Unknown code — force empty result rather than returning every partner's cars.
    return { id: { in: ["__none__"] } };
  }
  const iata = normalizeLocationCode(code).toUpperCase();
  return {
    deliveryPrices: {
      some: {
        deliveryLocation: {
          isActive: true,
          OR: [
            { id: { in: locationIds } },
            { airport: { iata: { equals: iata, mode: "insensitive" } } },
          ],
        },
      },
    },
  };
}

function syncPickupPlacesDescription(description: string, keepIds: Set<string>): string {
  const details = parseCarDetails(description);
  if (!details) return description;
  const places = Array.isArray(details.pickupPlaces) ? details.pickupPlaces : [];
  const kept = places.filter((place) => {
    if (!place || typeof place !== "object") return false;
    const id = String((place as { deliveryLocationId?: unknown }).deliveryLocationId || "").trim();
    if (!id) return false;
    if (keepIds.has(id)) return true;
    const norm = normalizeLocationCode(id).toUpperCase();
    return [...keepIds].some((k) => normalizeLocationCode(k).toUpperCase() === norm);
  });
  // Prefer keepIds order: ensure every kept assignment appears in metadata.
  const present = new Set(
    kept.map((p) =>
      String((p as { deliveryLocationId?: unknown }).deliveryLocationId || "").trim(),
    ),
  );
  for (const id of keepIds) {
    if (!present.has(id)) kept.push({ deliveryLocationId: id, enabled: true });
  }
  const blob = `<!--car-details:${JSON.stringify({ ...details, pickupPlaces: kept })}-->`;
  if (/<!--car-details:[\s\S]*?-->/.test(description)) {
    return description.replace(/<!--car-details:[\s\S]*?-->/, () => blob);
  }
  return `${description}\n${blob}`.trim();
}

/**
 * On admin approve: keep only car↔location rows the listing explicitly selected
 * (pickupPlaces in description ∩ existing deliveryPrices). Drop orphans and sync
 * description metadata to the kept set.
 */
export async function sanitizeCarDeliveryAssignmentsOnApprove(carId: string): Promise<{
  kept: number;
  removed: number;
}> {
  const { prisma } = await import("@/lib/prisma");
  const car = await prisma.car.findUnique({
    where: { id: carId },
    select: {
      description: true,
      deliveryPrices: { select: { id: true, deliveryLocationId: true } },
    },
  });

  const all = await listDeliveryLocations({ activeOnly: false });
  const byId = new Map(all.map((l) => [l.id, l]));
  const byIata = new Map(
    all.map((l) => [normalizeLocationCode(l.iata).toUpperCase(), l] as const),
  );

  const resolve = (raw: string) => {
    const key = String(raw || "").trim();
    if (!key) return null;
    return byId.get(key) || byIata.get(normalizeLocationCode(key).toUpperCase()) || null;
  };

  let description = car?.description || "";
  let deliveryRows = car?.deliveryPrices || [];

  // File-backed listing fallback when Prisma car is missing.
  if (!car) {
    try {
      const { getFileCar, updateFileCar } = await import("@/lib/server/partner-cars-store");
      const fileCar = await getFileCar(carId);
      if (!fileCar) return { kept: 0, removed: 0 };
      description = fileCar.description || "";
      const selectedRaw = listingPickupPlaceIds(description);
      const keep = new Set<string>();
      const fileRows = fileCar.deliveryPrices || [];
      if (selectedRaw.size) {
        for (const raw of selectedRaw) {
          const loc = resolve(raw);
          if (loc) keep.add(loc.id);
          else if (fileRows.some((r) => r.deliveryLocationId === raw)) keep.add(raw);
        }
      } else {
        for (const row of fileRows) keep.add(row.deliveryLocationId);
      }
      const nextPrices = fileRows.filter((row) => keep.has(row.deliveryLocationId));
      const removed = fileRows.length - nextPrices.length;
      await updateFileCar(carId, {
        deliveryPrices: nextPrices,
        description: syncPickupPlacesDescription(description, keep),
      });
      return { kept: keep.size, removed };
    } catch {
      return { kept: 0, removed: 0 };
    }
  }

  const selectedRaw = listingPickupPlaceIds(description);
  const keep = new Set<string>();
  if (selectedRaw.size) {
    for (const raw of selectedRaw) {
      const loc = resolve(raw);
      if (loc) keep.add(loc.id);
    }
    // Intersection: only selected places that already have a delivery row stay active.
    // If description lists a place with no row, do not invent one on approve.
    const rowIds = new Set(deliveryRows.map((r) => r.deliveryLocationId));
    for (const id of [...keep]) {
      if (!rowIds.has(id)) keep.delete(id);
    }
    // If description selected nothing that has a row, fall back to existing rows
    // that resolve as selected aliases (id vs iata).
    if (!keep.size) {
      for (const row of deliveryRows) {
        const loc = resolve(row.deliveryLocationId);
        if (!loc) continue;
        const aliases = [loc.id, loc.iata, loc.airportId].map((v) =>
          normalizeLocationCode(v || "").toUpperCase(),
        );
        if ([...selectedRaw].some((raw) => aliases.includes(normalizeLocationCode(raw).toUpperCase()))) {
          keep.add(loc.id);
        }
      }
    }
  } else {
    // Legacy listings without pickupPlaces metadata: keep what is already on the car.
    for (const row of deliveryRows) keep.add(row.deliveryLocationId);
  }

  const toRemove = deliveryRows
    .filter((row) => !keep.has(row.deliveryLocationId))
    .map((row) => row.id);

  if (toRemove.length) {
    await prisma.carDeliveryPrice.deleteMany({
      where: { id: { in: toRemove } },
    });
  }

  const nextDescription = syncPickupPlacesDescription(description, keep);
  if (nextDescription !== description) {
    await prisma.car.update({
      where: { id: carId },
      data: { description: nextDescription },
    });
  }

  // Mirror to file store when present.
  try {
    const { getFileCar, updateFileCar } = await import("@/lib/server/partner-cars-store");
    const fileCar = await getFileCar(carId);
    if (fileCar) {
      const nextPrices = (fileCar.deliveryPrices || []).filter((row) => {
        const loc = resolve(row.deliveryLocationId);
        return keep.has(row.deliveryLocationId) || (loc ? keep.has(loc.id) : false);
      });
      await updateFileCar(carId, {
        deliveryPrices: nextPrices,
        description: nextDescription,
      });
    }
  } catch {
    /* file mirror optional */
  }

  return { kept: keep.size, removed: toRemove.length };
}
