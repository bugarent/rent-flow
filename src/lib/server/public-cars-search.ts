import "server-only";

import { carMatchesMappedModels } from "@/lib/cars/category-mapping";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import type { DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import { loadSearchCatalog, clearSearchCatalog, type CatalogCar } from "@/lib/server/search-catalog";
import { scopeSearchCars } from "@/lib/server/search-results-scope";

export type PublicCarsQuery = {
  category?: string;
  pickup?: string;
  dropoff?: string;
  startDate?: string;
  endDate?: string;
};

/** Lean public shape of GET /api/cars (no description blob, nested catalog rows or review lists). */
export type PublicCarItem = {
  id: string;
  url: string;
  title: string;
  make: string;
  model: string;
  year: number;
  seats: number;
  doors: number;
  transmission: string;
  fuelType: string;
  categorySlug: string | null;
  dailyRateEur: number;
  discountPercent: number;
  photos: string[];
  partner: { name: string; rating: number | null; reviews: number };
  delivery: Array<{
    code: string;
    countryIso2: string;
    priceEur: number;
    freeAfterDays: number | null;
    travelTimeMinutes: number;
  }>;
};

type Timer = { mark: (name: string) => void; header: () => string };

export function createServerTimer(): Timer {
  const start = performance.now();
  let last = start;
  const marks: string[] = [];
  return {
    mark(name) {
      const now = performance.now();
      marks.push(`${name};dur=${(now - last).toFixed(1)}`);
      last = now;
    },
    header() {
      return [...marks, `total;dur=${(performance.now() - start).toFixed(1)}`].join(", ");
    },
  };
}

/** Insurance-expiry re-moderation used to run on every search; once per 5 minutes is plenty. */
const INSURANCE_CHECK_MS = 5 * 60_000;
let insuranceCheckedAt = 0;

function scheduleInsuranceExpiryCheck() {
  if (Date.now() - insuranceCheckedAt < INSURANCE_CHECK_MS) return;
  insuranceCheckedAt = Date.now();
  void import("@/lib/server/car-insurance-expiry")
    .then((m) => m.applyExpiredInsuranceRemoderation())
    .then((result) => {
      if (result.remodeated > 0) clearSearchCatalog();
    })
    .catch((error) => console.warn("[cars search] insurance expiry", error));
}

function validDate(raw?: string) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inCategory(car: CatalogCar, slug: string, mapped: Array<{ make: string; model: string }> | null) {
  if (car.categorySlug === slug) return true;
  return Boolean(mapped?.length && carMatchesMappedModels(car.make, car.model, mapped));
}

function deliveryOut(rows: DeliveryPriceRowLike[] | undefined): PublicCarItem["delivery"] {
  return (rows || [])
    .filter((row) => row.deliveryLocation?.isActive !== false)
    .map((row) => ({
      code: normalizeLocationCode(String(row.deliveryLocation?.airport?.iata || row.deliveryLocationId || "")).toUpperCase(),
      countryIso2: String(row.deliveryLocation?.airport?.city?.country?.iso2 || "").toUpperCase(),
      priceEur: Number(row.priceEur) || 0,
      freeAfterDays: row.freeAfterDays == null ? null : Number(row.freeAfterDays),
      travelTimeMinutes: Number(row.travelTimeMinutes) || 0,
    }))
    .filter((row) => row.code);
}

/**
 * Public car search: every filter runs in memory over the shared 30s catalog and the
 * occupancy snapshot, so a warm instance answers without a database round trip.
 */
export async function searchPublicCars(query: PublicCarsQuery, timer?: Timer): Promise<PublicCarItem[]> {
  scheduleInsuranceExpiryCheck();
  const catalog = await loadSearchCatalog();
  timer?.mark("catalog");

  let cars = catalog.cars;
  const category = query.category?.trim();
  if (category) {
    const homepage = catalog.categories.find((c) => c.slug === category);
    cars = cars.filter((car) => inCategory(car, category, homepage?.mappedModels ?? null));
  }

  const pickup = query.pickup?.trim();
  const dropoff = query.dropoff?.trim() || undefined;
  cars = (
    await scopeSearchCars(cars, catalog.cabinet, { pickup, dropoff, prefsByPartner: catalog.prefsByPartner })
  ).cars;
  timer?.mark("scope");

  const start = validDate(query.startDate?.trim());
  if (start && pickup) {
    const minutesUntilPickup = Math.max(0, Math.floor((start.getTime() - Date.now()) / 60000));
    const { meetsBookingLeadTime } = await import("@/lib/delivery/booking-lead");
    const { matchDeliveryRowsForPlace } = await import("@/lib/delivery/trip-fees");
    cars = cars.filter((car) =>
      matchDeliveryRowsForPlace(car.deliveryPrices, pickup).some((row) =>
        meetsBookingLeadTime(Number(row.travelTimeMinutes) || 0, minutesUntilPickup),
      ),
    );
  }

  const end = validDate(query.endDate?.trim()) ?? (start ? new Date(start.getTime() + 86_400_000) : null);
  if (start && end) {
    try {
      const { carIdsUnavailableInRange } = await import("@/lib/server/car-availability");
      const unavailable = await carIdsUnavailableInRange(start, end);
      if (unavailable.size) cars = cars.filter((car) => !unavailable.has(car.id));
    } catch {
      /* availability optional */
    }
    timer?.mark("availability");
  }

  let periodMap = new Map<string, number>();
  let mergeDiscount = (base: number, period: number) => Math.max(base, period);
  try {
    const store = await import("@/lib/server/partner-period-discounts-store");
    const from = query.startDate?.trim() || new Date().toISOString();
    periodMap = await store.periodDiscountPercentByCarId(from, query.endDate?.trim() || from, cars.map((c) => c.id));
    mergeDiscount = store.mergeListingDiscountPercent;
  } catch {
    /* period discounts optional */
  }
  timer?.mark("discounts");

  return cars.map((car) => {
    const rating = catalog.ratings.get(car.partnerId);
    return {
      id: car.id,
      url: `/cars/${encodeURIComponent(car.id)}`,
      title: car.title,
      make: car.make,
      model: car.model,
      year: car.year,
      seats: car.seats,
      doors: car.doors,
      transmission: car.transmission,
      fuelType: car.fuelType,
      categorySlug: car.categorySlug,
      dailyRateEur: car.dailyRateEur,
      discountPercent: mergeDiscount(car.discountPercent, periodMap.get(car.id) ?? 0),
      photos: car.photos,
      partner: {
        name: car.partner.companyName,
        rating: rating && rating.count ? rating.average : null,
        reviews: rating?.count ?? 0,
      },
      delivery: deliveryOut(car.deliveryPrices),
    };
  });
}
