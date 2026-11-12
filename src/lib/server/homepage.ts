import { prisma } from "@/lib/prisma";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import type { PopularAirportsLayout } from "@/lib/catalog/popular-airports-layout";
import type { AirportCardTranslations } from "@/lib/catalog/homepage-airport-i18n";
import type { MappedCarModel } from "@/lib/catalog/car-models";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";
import { listHomepageCategories } from "@/lib/server/homepage-categories-store";
import { getPopularAirportsLayout as readPopularAirportsLayout } from "@/lib/server/homepage-airports-layout-store";

export type { PopularAirportsLayout };

export type HomepageCategoryCard = {
  id: string;
  slug: string;
  name: string;
  details: string;
  imageUrl: string;
  mappedModels: MappedCarModel[];
};

export type HomepageAirportCard = {
  id: string;
  iata: string;
  title: string;
  imageUrl: string;
  infoText: string;
  translations?: AirportCardTranslations;
};

export async function ensureHomepageDefaults() {
  const { isDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return;

  try {
    // Never block the homepage for more than ~1.2s on a dead DB.
    const { softTimeout } = await import("@/lib/server/soft-timeout");
    await softTimeout(
      (async () => {
        const categoryCount = await prisma.homepageCategory.count();
        const airportCount = await prisma.homepageAirport.count();

        if (categoryCount === 0) {
          await prisma.homepageCategory.createMany({
            data: VEHICLE_CATEGORIES.map((c, index) => ({
              slug: c.id,
              name: c.name,
              details: summarizeMappedModels(c.mappedModels) || c.model,
              imageUrl: c.image,
              mappedModels: c.mappedModels,
              sortOrder: index,
            })),
          });
        }

        if (airportCount === 0) {
          const defaults = getStaticPopularAirports();
          await prisma.homepageAirport.createMany({
            data: defaults.map((a, index) => ({
              iata: a.iata,
              title: a.name,
              imageUrl: a.image,
              sortOrder: index,
            })),
          });
        }
      })(),
      undefined,
      1200,
    );
  } catch (error) {
    const { markDbCircuitOpen } = await import("@/lib/prisma");
    const { isDbOfflineError } = await import("@/lib/server/db-errors");
    if (isDbOfflineError(error)) {
      markDbCircuitOpen("homepage-defaults", error);
      return;
    }
    throw error;
  }
}

/** Built-in cards, only for when nothing was ever loaded from the saved stores. */
export function staticHomepageCategories(): HomepageCategoryCard[] {
  return VEHICLE_CATEGORIES.map((c) => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    details: summarizeMappedModels(c.mappedModels) || c.model,
    imageUrl: c.image,
    mappedModels: c.mappedModels ?? [],
  }));
}

export function staticHomepageAirports(): HomepageAirportCard[] {
  return getStaticPopularAirports().map((a) => ({
    id: a.iata,
    iata: a.iata,
    title: a.name,
    imageUrl: a.image,
    infoText: "",
  }));
}

function activeCategoryCards(rows: Awaited<ReturnType<typeof listHomepageCategories>>): HomepageCategoryCard[] {
  return rows
    .filter((c) => c.isActive !== false)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      details: c.details,
      imageUrl: c.imageUrl,
      mappedModels: c.mappedModels,
    }));
}

/** Saved categories only; empty when the store could not be read (so caches never keep built-ins). */
export async function loadHomepageCategories(): Promise<HomepageCategoryCard[]> {
  try {
    return activeCategoryCards(await listHomepageCategories());
  } catch {
    return [];
  }
}

/** Saved airport cards only; empty when the store could not be read. */
export async function loadHomepageAirports(): Promise<HomepageAirportCard[]> {
  try {
    const { listHomepageAirports } = await import("@/lib/server/homepage-airports-store");
    const rows = await listHomepageAirports();
    return rows.map((a) => ({
      id: a.id,
      iata: a.iata,
      title: a.title,
      imageUrl: a.imageUrl,
      infoText: a.infoText,
      translations: a.translations,
    }));
  } catch {
    return [];
  }
}

export async function getHomepageCategories(): Promise<HomepageCategoryCard[]> {
  try {
    const rows = await listHomepageCategories();
    return rows.length ? activeCategoryCards(rows) : staticHomepageCategories();
  } catch {
    return staticHomepageCategories();
  }
}

export async function getHomepageAirports(): Promise<HomepageAirportCard[]> {
  const rows = await loadHomepageAirports();
  return rows.length ? rows : staticHomepageAirports();
}

export async function getPopularAirportsLayoutSetting(): Promise<PopularAirportsLayout> {
  try {
    return await readPopularAirportsLayout();
  } catch {
    return "grid";
  }
}
