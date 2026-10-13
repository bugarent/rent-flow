import "server-only";

import { parseCarDetails } from "@/lib/cars/car-details";
import { findSearchPlace, isCityLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { prisma } from "@/lib/prisma";

function isAirportPlace(loc: DeliveryLocationView): boolean {
  if (loc.kind === "city" || isCityLocationCode(loc.iata)) return false;
  return findSearchPlace(loc.iata)?.kind === "airport";
}

function listingOffers(description: string, locationId: string): boolean {
  const places = parseCarDetails(description)?.pickupPlaces;
  if (!Array.isArray(places)) return false;
  return places.some(
    (place) =>
      Boolean(place) &&
      typeof place === "object" &&
      String((place as { deliveryLocationId?: unknown }).deliveryLocationId || "") === locationId,
  );
}

/**
 * Listings that offer a just-promoted airport on their pick-up list get the
 * delivery row they could not store before, at the partner's Delivery-page price.
 */
async function addMissingListingRows(loc: DeliveryLocationView): Promise<number> {
  const cars = await prisma.car.findMany({
    where: {
      description: { contains: loc.id },
      deliveryPrices: { none: { deliveryLocationId: loc.id } },
    },
    select: { id: true, partnerId: true, description: true },
  });
  const { withPartnerDeliveryPrices } = await import("@/lib/server/partner-delivery-listing-sync");
  let added = 0;
  for (const car of cars) {
    if (!listingOffers(car.description, loc.id)) continue;
    const [row] = await withPartnerDeliveryPrices(
      car.partnerId,
      [{ deliveryLocationId: loc.id, priceEur: 0, freeAfterDays: null, travelTimeMinutes: 0 }],
      [loc],
    );
    const result = await prisma.carDeliveryPrice.createMany({
      data: [{ carId: car.id, ...row }],
      skipDuplicates: true,
    });
    added += result.count;
  }
  return added;
}

/**
 * Airports first saved only in the file store (their country had no airport in
 * the database yet) become database rows under the same id, so listings can
 * store delivery prices for them and search can match their cars.
 */
export async function promoteFileOnlyAirportLocations(): Promise<number> {
  const { isDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return 0;

  const { createDeliveryLocation, listDeliveryLocations, clearSearchAirportsCache } = await import(
    "@/lib/server/delivery-locations"
  );
  let candidates: DeliveryLocationView[];
  try {
    const [all, dbRows] = await Promise.all([
      listDeliveryLocations({ activeOnly: false }),
      prisma.deliveryLocation.findMany({ select: { id: true } }),
    ]);
    const inDb = new Set(dbRows.map((row) => row.id));
    candidates = all.filter((loc) => !inDb.has(loc.id) && isAirportPlace(loc));
  } catch (error) {
    console.warn("[promote-file-airports] skipped", error);
    return 0;
  }
  if (!candidates.length) return 0;

  let promoted = 0;
  let rowsAdded = 0;
  for (const loc of candidates) {
    try {
      const saved = await createDeliveryLocation({
        airportId: loc.iata,
        maxDeliveryPriceEur: loc.maxDeliveryPriceEur,
        isActive: loc.isActive,
        sortOrder: loc.sortOrder,
      });
      const inDb = await prisma.deliveryLocation.findUnique({ where: { id: loc.id }, select: { id: true } });
      if (!inDb || saved.id !== loc.id) continue;
      promoted += 1;
      rowsAdded += await addMissingListingRows(loc);
    } catch (error) {
      console.warn("[promote-file-airports]", loc.iata, error);
    }
  }

  if (promoted) {
    clearSearchAirportsCache();
    const [{ clearPublicCarPayloadCache }, { revalidatePublishedContent }] = await Promise.all([
      import("@/lib/server/public-car-payload"),
      import("@/lib/server/revalidate-public-content"),
    ]);
    clearPublicCarPayloadCache();
    revalidatePublishedContent();
    console.info(`[promote-file-airports] ${promoted} airport(s) moved to the database, ${rowsAdded} listing row(s) added`);
  }
  return promoted;
}
