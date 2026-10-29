import "server-only";

import { normalizeLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { isPublicFileCar, listFileCars, type FileCarListing } from "@/lib/server/partner-cars-store";
import {
  overlayPublishedListing,
  readPublishedSnapshotsMap,
  type PublishedCarSnapshot,
} from "@/lib/server/car-published-store";

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
      maxDeliveryPriceEur?: number;
      airport: { iata: string; city: { name?: string; country: { iso2: string } } } | null;
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
          isActive: loc?.isActive === true,
          maxDeliveryPriceEur: loc?.maxDeliveryPriceEur ?? 0,
          airport: iata
            ? {
                iata,
                city: {
                  name: loc?.cityName,
                  country: { iso2: (loc?.countryIso2 || "").toUpperCase() },
                },
              }
            : null,
        },
      };
    }),
  };
}

/**
 * A listing saved while the database was down gets `file-partner-<session user id>`. That is the
 * user id, not the Partner id, so search found no Delivery places or personal info for it and the
 * approved listing vanished. Map such ids back to the real partner.
 */
async function realPartnerIdResolver(): Promise<(car: FileCarListing) => string> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const partners = await prisma.partner.findMany({ select: { id: true, userId: true, email: true } });
    const ids = new Set(partners.map((p) => p.id));
    const byUser = new Map(partners.filter((p) => p.userId).map((p) => [p.userId as string, p.id]));
    const byEmail = new Map(partners.map((p) => [p.email.trim().toLowerCase(), p.id]));
    return (car) => {
      const raw = String(car.partnerId || "").trim();
      const bare = raw.replace(/^file-partner-/, "");
      if (ids.has(raw) || ids.has(bare)) return ids.has(raw) ? raw : bare;
      return (
        byUser.get(bare) ||
        byUser.get(String(car.partnerUserId || "")) ||
        byEmail.get(String(car.partnerEmail || "").trim().toLowerCase()) ||
        raw
      );
    };
  } catch {
    return (car) => car.partnerId;
  }
}

/** Places and fees are applied later from the partner's Delivery page (scopeSearchCars). */
export async function loadPublicFileSearchCars(): Promise<FileSearchCar[]> {
  const [stored, locations, snapshots, partnerIdOf] = await Promise.all([
    listFileCars(),
    listDeliveryLocations({ activeOnly: false }),
    readPublishedSnapshotsMap().catch(() => new Map<string, PublishedCarSnapshot>()),
    realPartnerIdResolver(),
  ]);
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  return stored
    .filter((car) => isPublicFileCar(car))
    .map((car) => {
      const shaped = { ...toSearchCar(car, byId), partnerId: partnerIdOf(car) };
      if (car.status !== "PENDING_REMODERATION") return shaped;
      return overlayPublishedListing({ ...shaped, status: car.status }, snapshots.get(car.id));
    });
}
