import { prisma } from "@/lib/prisma";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import type { PopularAirportsLayout } from "@/lib/catalog/popular-airports-layout";
import type { MappedCarModel } from "@/lib/catalog/car-models";
import { parseMappedModels, summarizeMappedModels } from "@/lib/cars/category-mapping";
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
        } else {
          // Backfill empty mappings for default slugs after schema upgrade
          const existing = await prisma.homepageCategory.findMany({
            select: { id: true, slug: true, mappedModels: true },
          });
          for (const row of existing) {
            const mapped = parseMappedModels(row.mappedModels);
            if (mapped.length > 0) continue;
            const defaults = VEHICLE_CATEGORIES.find((c) => c.id === row.slug);
            if (!defaults?.mappedModels.length) continue;
            await prisma.homepageCategory.update({
              where: { id: row.id },
              data: {
                mappedModels: defaults.mappedModels,
                details: summarizeMappedModels(defaults.mappedModels) || defaults.model,
              },
            });
          }
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
      () => {
        void import("@/lib/prisma").then((m) => m.markDbCircuitOpen("homepage-defaults-timeout"));
      },
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

export async function getHomepageCategories(): Promise<HomepageCategoryCard[]> {
  try {
    try {
      await ensureHomepageDefaults();
    } catch {
      /* DB offline — listHomepageCategories falls back to file store */
    }
    const rows = await listHomepageCategories();
    if (rows.length === 0) {
      return VEHICLE_CATEGORIES.map((c) => ({
        id: c.id,
        slug: c.id,
        name: c.name,
        details: summarizeMappedModels(c.mappedModels) || c.model,
        imageUrl: c.image,
        mappedModels: c.mappedModels ?? [],
      }));
    }
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
  } catch {
    return VEHICLE_CATEGORIES.map((c) => ({
      id: c.id,
      slug: c.id,
      name: c.name,
      details: summarizeMappedModels(c.mappedModels) || c.model,
      imageUrl: c.image,
      mappedModels: c.mappedModels ?? [],
    }));
  }
}

export async function getHomepageAirports(): Promise<HomepageAirportCard[]> {
  try {
    try {
      await ensureHomepageDefaults();
    } catch {
      /* DB offline — listHomepageAirports falls back to file store */
    }
    const { listHomepageAirports } = await import("@/lib/server/homepage-airports-store");
    const rows = await listHomepageAirports();
    if (rows.length === 0) {
      return getStaticPopularAirports().map((a) => ({
        id: a.iata,
        iata: a.iata,
        title: a.name,
        imageUrl: a.image,
      }));
    }
    return rows.map((a) => ({
      id: a.id,
      iata: a.iata,
      title: a.title,
      imageUrl: a.imageUrl,
    }));
  } catch {
    return getStaticPopularAirports().map((a) => ({
      id: a.iata,
      iata: a.iata,
      title: a.name,
      imageUrl: a.image,
    }));
  }
}

export async function getPopularAirportsLayoutSetting(): Promise<PopularAirportsLayout> {
  try {
    return await readPopularAirportsLayout();
  } catch {
    return "grid";
  }
}
