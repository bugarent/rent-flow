import "server-only";

import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import type { SeoLocation } from "@/lib/seo/location-landings";
import { publicListingStatusWhere, publicPartnerWhere } from "@/lib/cars/listing-visibility";
import { softTimeout } from "@/lib/server/soft-timeout";
import { toNumber } from "@/lib/utils";

export type LocationOfferSample = {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  priceEur: number;
  image?: string | null;
  path: string;
};

export type LocationLandingExtras = {
  imageUrl?: string;
  lowPriceEur?: number | null;
  offerCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  samples: LocationOfferSample[];
};

function catalogCoords(location: SeoLocation): { latitude?: number; longitude?: number } {
  const iata = (location.iata || (location.kind === "airport" ? location.code : "")).toUpperCase();
  if (!iata || iata.startsWith("CITY-")) return {};
  const hit = CATALOG_AIRPORTS.find((a) => a.iata === iata);
  if (!hit || hit.latitude == null || hit.longitude == null) return {};
  return { latitude: hit.latitude, longitude: hit.longitude };
}

async function resolveOgImage(location: SeoLocation): Promise<string | undefined> {
  try {
    const { listHomepageAirports } = await import("@/lib/server/homepage-airports-store");
    const rows = await listHomepageAirports();
    const code = normalizeLocationCode(location.code);
    const hit = rows.find((row) => normalizeLocationCode(row.iata) === code);
    const url = hit?.imageUrl?.trim();
    return url || undefined;
  } catch {
    return undefined;
  }
}

async function resolveOfferSamples(location: SeoLocation): Promise<{
  samples: LocationOfferSample[];
  lowPriceEur: number | null;
  offerCount: number | null;
}> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { loadSearchCabinet, partnerIdsForPlace } = await import(
      "@/lib/server/search-cabinet-scope"
    );
    const code = normalizeLocationCode(location.code);
    const cabinet = await loadSearchCabinet();
    const partnerIds = partnerIdsForPlace(cabinet, code);
    const airportKey = (location.iata || code).toUpperCase();

    const placeFilter = partnerIds.length
      ? { partnerId: { in: partnerIds } }
      : {
          deliveryPrices: {
            some: {
              deliveryLocation: {
                isActive: true,
                airport: {
                  OR: [
                    { iata: { equals: airportKey, mode: "insensitive" as const } },
                    { id: { equals: code, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          },
        };

    const cars = await prisma.car.findMany({
      where: {
        ...publicListingStatusWhere,
        partner: publicPartnerWhere,
        ...placeFilter,
      },
      select: {
        id: true,
        make: true,
        model: true,
        title: true,
        dailyRateEur: true,
        photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { dailyRateEur: "asc" },
      take: 8,
    });

    const samples: LocationOfferSample[] = [];
    for (const car of cars) {
      const priceEur = toNumber(car.dailyRateEur);
      if (!Number.isFinite(priceEur) || priceEur <= 0) continue;
      samples.push({
        id: car.id,
        name: (car.title || `${car.make} ${car.model}`).trim(),
        brand: car.make || undefined,
        model: car.model || undefined,
        priceEur,
        image: car.photos[0]?.url || null,
        path: `/cars/${encodeURIComponent(car.id)}`,
      });
    }

    return {
      samples,
      lowPriceEur: samples[0]?.priceEur ?? null,
      offerCount: samples.length ? samples.length : null,
    };
  } catch {
    return { samples: [], lowPriceEur: null, offerCount: null };
  }
}

/** Banner image, geo, and a few cheapest offers for schema / OG on location landings. */
export async function loadLocationLandingExtras(
  location: SeoLocation,
): Promise<LocationLandingExtras> {
  const [imageUrl, offers] = await Promise.all([
    softTimeout(resolveOgImage(location), undefined, 2000),
    softTimeout(resolveOfferSamples(location), { samples: [], lowPriceEur: null, offerCount: null }, 2500),
  ]);
  const coords = catalogCoords(location);
  return {
    imageUrl,
    lowPriceEur: offers.lowPriceEur,
    offerCount: offers.offerCount,
    latitude: coords.latitude ?? null,
    longitude: coords.longitude ?? null,
    samples: offers.samples,
  };
}
