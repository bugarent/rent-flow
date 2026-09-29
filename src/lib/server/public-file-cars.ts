import "server-only";

import { isCityLocationCode, normalizeLocationCode, parseCityLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { isPublicFileCarStatus, listFileCars, type FileCarListing } from "@/lib/server/partner-cars-store";

export type FileSearchCar = {
  id: string;
  partnerId: string;
  make: string;
  model: string;
  year: number;
  title: string;
  seats: number;
  doors: number;
  transmission: string;
  fuelType: string;
  dailyRateEur: number;
  discountPercent: number;
  description: string;
  categorySlug: string | null;
  photos: Array<{ url: string }>;
  partner: {
    companyName: string;
    logoUrl: string | null;
    reviews: Array<{ averageRating: number }>;
  };
  extras?: Array<{
    extraServiceId?: string;
    priceEur?: number;
    extraService: null;
  }>;
  deliveryPrices: Array<{
    deliveryLocationId: string;
    priceEur: number;
    freeAfterDays: number | null;
    travelTimeMinutes: number | null;
    deliveryLocation: {
      id: string;
      isActive: boolean;
      airport: { iata: string; city: { country: { iso2: string } } } | null;
    } | null;
  }>;
};

function toSearchCar(car: FileCarListing, byId: Map<string, DeliveryLocationView>): FileSearchCar {
  return {
    id: car.id,
    partnerId: car.partnerId,
    make: car.make,
    model: car.model,
    year: car.year,
    title: car.title,
    seats: car.seats || 5,
    doors: car.doors || 4,
    transmission: car.transmission || "AUTOMATIC",
    fuelType: car.fuelType || "PETROL",
    dailyRateEur: car.dailyRateEur,
    discountPercent: 0,
    description: car.description || "",
    categorySlug: car.categorySlug,
    photos: (Array.isArray(car.photos) ? car.photos : [])
      .map((url) => String(url || "").trim())
      .filter(Boolean)
      .map((url) => ({ url })),
    partner: {
      companyName: car.partnerName || "Partner",
      logoUrl: null,
      reviews: [],
    },
    extras: (car.extras || []).map((row) => ({
      extraService: null as null,
      extraServiceId: row.extraServiceId,
      priceEur: Number(row.priceEur) || 0,
    })),
    deliveryPrices: (car.deliveryPrices || []).map((row) => {
      const loc = byId.get(row.deliveryLocationId);
      const iata = (loc?.iata || normalizeLocationCode(row.deliveryLocationId) || "").toUpperCase();
      return {
        deliveryLocationId: row.deliveryLocationId,
        priceEur: Number(row.priceEur) || 0,
        freeAfterDays: row.freeAfterDays ?? null,
        travelTimeMinutes: row.travelTimeMinutes ?? 0,
        deliveryLocation: {
          id: loc?.id || row.deliveryLocationId,
          isActive: loc ? loc.isActive !== false : Boolean(iata),
          airport: iata
            ? {
                iata,
                city: { country: { iso2: (loc?.countryIso2 || "").toUpperCase() } },
              }
            : null,
        },
      };
    }),
  };
}

export function fileSearchCarMatchesPickup(car: FileSearchCar, pickup: string) {
  const code = pickup.trim();
  if (!code) return true;
  const rows = car.deliveryPrices ?? [];
  if (isCityLocationCode(code)) {
    const iso2 = parseCityLocationCode(code)?.iso2?.toUpperCase();
    if (!iso2) return false;
    return rows.some((row) => {
      const loc = row.deliveryLocation;
      return Boolean(loc?.isActive && loc.airport?.city?.country?.iso2?.toUpperCase() === iso2);
    });
  }
  const iata = code.toUpperCase();
  return rows.some((row) => {
    const loc = row.deliveryLocation;
    return Boolean(loc?.isActive && loc.airport?.iata?.toUpperCase() === iata);
  });
}

export async function loadPublicFileSearchCars(opts?: {
  pickup?: string | null;
}): Promise<FileSearchCar[]> {
  const [stored, locations] = await Promise.all([
    listFileCars(),
    listDeliveryLocations({ activeOnly: false }),
  ]);
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  const pickup = opts?.pickup?.trim() || "";
  return stored
    .filter((car) => isPublicFileCarStatus(car.status))
    .map((car) => toSearchCar(car, byId))
    .filter((car) => (pickup ? fileSearchCarMatchesPickup(car, pickup) : true));
}
