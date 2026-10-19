import "server-only";

import { publicListingStatusWhere, publicPartnerWhere } from "@/lib/cars/listing-visibility";
import type { DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import type { PartnerDeliveryPref } from "@/lib/server/partner-delivery-prefs-store";
import type { SearchCabinet } from "@/lib/server/search-cabinet-scope";
import type { StoredHomepageCategory } from "@/lib/server/homepage-categories-store";

/** Only what search filtering and the public car list need — no description blob, no extras. */
export type CatalogCar = {
  id: string;
  partnerId: string;
  status: string;
  title: string;
  make: string;
  model: string;
  year: number;
  seats: number;
  doors: number;
  transmission: string;
  fuelType: string;
  dailyRateEur: number;
  discountPercent: number;
  categorySlug: string | null;
  photos: string[];
  partner: { id: string; companyName: string };
  deliveryPrices: DeliveryPriceRowLike[];
};

export type SearchCatalog = {
  builtAt: number;
  /** Built while the database was failing (listings or partner places missing). */
  degraded: boolean;
  cars: CatalogCar[];
  cabinet: SearchCabinet;
  prefsByPartner: Map<string, PartnerDeliveryPref[]>;
  categories: StoredHomepageCategory[];
  ratings: Map<string, { average: number; count: number }>;
};

/** Fresh for 30s; an older copy (up to 5 min) answers instantly while a refresh runs in the background. */
const FRESH_MS = 30_000;
const STALE_MS = 5 * 60_000;
/** A partial read during a database hiccup is retried quickly and never replaces a good copy. */
const DEGRADED_FRESH_MS = 5_000;

type CachedRead = { at: number; generation: number; value: unknown };

const globalForCatalog = globalThis as typeof globalThis & {
  __searchCatalog?: {
    value: SearchCatalog | null;
    /** Last complete catalog, kept across clears to answer while the database is failing. */
    lastGood?: SearchCatalog | null;
    loading: Promise<SearchCatalog> | null;
    generation: number;
    reads: Map<string, CachedRead>;
    pendingReads: Map<string, Promise<unknown>>;
  };
};
const state = (globalForCatalog.__searchCatalog ??= {
  value: null,
  lastGood: null,
  loading: null,
  generation: 0,
  reads: new Map(),
  pendingReads: new Map(),
});
// Dev hot reload keeps the object from an older module version; make sure every field exists.
state.lastGood ??= null;
state.reads ??= new Map();
state.pendingReads ??= new Map();
state.generation ??= 0;

/** Drop the cached catalog (and every cachedSearchRead) after a listing, delivery price, partner or category change. */
export function clearSearchCatalog() {
  if (state.value && !state.value.degraded) state.lastGood = state.value;
  state.value = null;
  // Old reads stay only as a fallback for a failing database; the generation bump makes them stale.
  state.generation += 1;
}

const FALLBACK_MS = 30 * 60_000;
const MAX_READS = 200;

/**
 * Same 30s fresh / 5 min stale-while-refresh cache as the catalog, for other reads the
 * search page needs. A thrown error is never cached, and `keep` can refuse an empty
 * result so a database hiccup is not served for minutes.
 */
export async function cachedSearchRead<T>(
  key: string,
  loader: () => Promise<T>,
  opts?: { keep?: (value: T) => boolean },
): Promise<T> {
  const hit = state.reads.get(key);
  const age = hit && hit.generation === state.generation ? Date.now() - hit.at : Infinity;
  if (hit && age < FRESH_MS) return hit.value as T;
  const run = () => {
    let pending = state.pendingReads.get(key) as Promise<T> | undefined;
    if (!pending) {
      const generation = state.generation;
      const fallback = () => {
        const old = state.reads.get(key);
        return old && Date.now() - old.at < FALLBACK_MS ? old : null;
      };
      pending = loader()
        .then((value) => {
          if ((opts?.keep?.(value) ?? true) && generation === state.generation) {
            state.reads.delete(key);
            state.reads.set(key, { at: Date.now(), generation, value });
            while (state.reads.size > MAX_READS) {
              const oldest = state.reads.keys().next().value;
              if (oldest === undefined) break;
              state.reads.delete(oldest);
            }
            return value;
          }
          // An empty / partial read while an older good one exists: answer with the older one.
          const old = opts?.keep && !opts.keep(value) ? fallback() : null;
          return old ? (old.value as T) : value;
        })
        .catch((error: unknown) => {
          const old = fallback();
          if (old) return old.value as T;
          throw error;
        })
        .finally(() => state.pendingReads.delete(key));
      state.pendingReads.set(key, pending);
    }
    return pending;
  };
  if (hit && age < STALE_MS) {
    void run().catch((error) => console.warn(`[search-catalog] refresh of ${key} failed`, error));
    return hit.value as T;
  }
  return run();
}

function partnerAliases(partnerId: string) {
  const bare = partnerId.trim().replace(/^file-partner-/, "");
  return [...new Set([partnerId.trim(), bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
}

const MAX_PHOTOS = 5;

async function loadDbCars(): Promise<{ cars: CatalogCar[]; ok: boolean }> {
  const { isDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return { cars: [], ok: false };
  try {
    const rows = await prisma.car.findMany({
      where: { ...publicListingStatusWhere, partner: publicPartnerWhere },
      select: {
        id: true,
        partnerId: true,
        status: true,
        title: true,
        make: true,
        model: true,
        year: true,
        seats: true,
        doors: true,
        transmission: true,
        fuelType: true,
        dailyRateEur: true,
        discountPercent: true,
        categorySlug: true,
        photos: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: MAX_PHOTOS },
        partner: { select: { id: true, companyName: true } },
        deliveryPrices: {
          select: {
            deliveryLocationId: true,
            priceEur: true,
            freeAfterDays: true,
            travelTimeMinutes: true,
            deliveryLocation: {
              select: {
                id: true,
                isActive: true,
                maxDeliveryPriceEur: true,
                airport: { select: { iata: true, city: { select: { country: { select: { iso2: true } } } } } },
              },
            },
          },
        },
      },
    });
    const cars = rows.map((car) => ({
      ...car,
      status: String(car.status),
      transmission: String(car.transmission),
      fuelType: String(car.fuelType),
      dailyRateEur: Number(car.dailyRateEur) || 0,
      discountPercent: Number(car.discountPercent) || 0,
      photos: car.photos.map((p) => p.url).filter(Boolean),
      deliveryPrices: car.deliveryPrices.map((row) => ({
        ...row,
        priceEur: Number(row.priceEur) || 0,
        deliveryLocation: row.deliveryLocation
          ? { ...row.deliveryLocation, maxDeliveryPriceEur: Number(row.deliveryLocation.maxDeliveryPriceEur) || 0 }
          : null,
      })),
    }));
    return { cars, ok: true };
  } catch (error) {
    if (isDbOfflineError(error)) return { cars: [], ok: false };
    throw error;
  }
}

async function loadFileCars(seen: Set<string>): Promise<CatalogCar[]> {
  try {
    const { loadPublicFileSearchCars } = await import("@/lib/server/public-file-cars");
    return (await loadPublicFileSearchCars())
      .filter((car) => !seen.has(car.id))
      .map((car) => ({
        id: car.id,
        partnerId: car.partnerId,
        status: "APPROVED",
        title: car.title,
        make: car.make,
        model: car.model,
        year: car.year,
        seats: car.seats,
        doors: car.doors,
        transmission: car.transmission,
        fuelType: car.fuelType,
        dailyRateEur: Number(car.dailyRateEur) || 0,
        discountPercent: Number(car.discountPercent) || 0,
        categorySlug: car.categorySlug,
        photos: car.photos.map((p) => p.url).filter(Boolean).slice(0, MAX_PHOTOS),
        partner: { id: car.partnerId, companyName: car.partner.companyName },
        deliveryPrices: car.deliveryPrices,
      }));
  } catch {
    return [];
  }
}

/** Live listings under re-moderation show their last approved version. */
async function withApprovedVersions(cars: CatalogCar[]): Promise<CatalogCar[]> {
  if (!cars.some((car) => car.status === "PENDING_REMODERATION")) return cars;
  try {
    const { readPublishedSnapshotsMap } = await import("@/lib/server/car-published-store");
    const snapshots = await readPublishedSnapshotsMap();
    return cars.map((car) => {
      const snap = car.status === "PENDING_REMODERATION" ? snapshots.get(car.id) : undefined;
      if (!snap) return car;
      const photos = (snap.photoUrls || []).filter(Boolean);
      return {
        ...car,
        title: snap.title || car.title,
        make: snap.make || car.make,
        model: snap.model || car.model,
        year: Number(snap.year) || car.year,
        dailyRateEur: Number(snap.dailyRateEur) || car.dailyRateEur,
        photos: photos.length ? photos.slice(0, MAX_PHOTOS) : car.photos,
      };
    });
  } catch {
    return cars;
  }
}

async function loadRatings(): Promise<Map<string, { average: number; count: number }>> {
  const map = new Map<string, { average: number; count: number }>();
  try {
    const rows = await prisma.review.groupBy({
      by: ["partnerId"],
      where: { status: "APPROVED" },
      _avg: { averageRating: true },
      _count: { _all: true },
    });
    for (const row of rows) {
      map.set(row.partnerId, {
        average: Math.round((row._avg.averageRating ?? 0) * 10) / 10,
        count: row._count._all,
      });
    }
  } catch {
    /* ratings optional */
  }
  return map;
}

async function build(): Promise<SearchCatalog> {
  const [{ loadSearchCabinet }, { listHomepageCategories }, { readPartnerDeliveryPrefsMap }] = await Promise.all([
    import("@/lib/server/search-cabinet-scope"),
    import("@/lib/server/homepage-categories-store"),
    import("@/lib/server/partner-delivery-prefs-store"),
  ]);
  const [db, cabinet, categories, ratings] = await Promise.all([
    loadDbCars(),
    loadSearchCabinet(),
    listHomepageCategories().catch(() => [] as StoredHomepageCategory[]),
    loadRatings(),
  ]);
  const fileCars = await loadFileCars(new Set(db.cars.map((car) => car.id)));
  const cars = await withApprovedVersions([...db.cars, ...fileCars]);
  let prefsOk = true;
  const prefsByPartner = await readPartnerDeliveryPrefsMap([
    ...new Set(cars.flatMap((car) => partnerAliases(car.partnerId))),
  ]).catch(() => {
    prefsOk = false;
    return new Map<string, PartnerDeliveryPref[]>();
  });
  // Live listings always belong to approved partners with cabinet places; none means the read failed.
  const degraded = !db.ok || !prefsOk || (db.cars.length > 0 && cabinet.byPartner.size === 0);
  return { builtAt: Date.now(), degraded, cars, cabinet, prefsByPartner, categories, ratings };
}

function refresh(): Promise<SearchCatalog> {
  if (state.loading) return state.loading;
  const generation = state.generation;
  state.loading = build()
    .then((value) => {
      const previous = state.value && !state.value.degraded ? state.value : state.lastGood;
      if (value.degraded && previous && Date.now() - previous.builtAt < 30 * 60_000) {
        console.warn("[search-catalog] database read incomplete; answering from the last good catalog");
        return previous;
      }
      if (!value.degraded) state.lastGood = value;
      // A clear during the build means the data changed again; do not keep the older read.
      if (generation === state.generation) state.value = value;
      return value;
    })
    .finally(() => {
      state.loading = null;
    });
  return state.loading;
}

/** Shared search dataset: one set of database reads serves every search for 30s. */
export async function loadSearchCatalog(): Promise<SearchCatalog> {
  const cached = state.value;
  const age = cached ? Date.now() - cached.builtAt : Infinity;
  if (cached && age < (cached.degraded ? DEGRADED_FRESH_MS : FRESH_MS)) return cached;
  if (cached && age < STALE_MS) {
    void refresh().catch((error) => console.warn("[search-catalog] background refresh failed", error));
    return cached;
  }
  return refresh();
}
