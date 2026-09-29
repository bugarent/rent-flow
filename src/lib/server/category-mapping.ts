import "server-only";

import type { Prisma } from "@prisma/client";
import type { MappedCarModel } from "@/lib/catalog/car-models";
import { carMatchesMappedModels } from "@/lib/cars/category-mapping";
import { listHomepageCategories } from "@/lib/server/homepage-categories-store";

/** Prisma OR filter for cars whose make+model match any mapping (case-insensitive). */
export function prismaWhereForMappedModels(mapped: MappedCarModel[]): Prisma.CarWhereInput | null {
  if (mapped.length === 0) return null;
  return {
    OR: mapped.map((m) => ({
      AND: [
        { make: { equals: m.make, mode: "insensitive" as const } },
        { model: { equals: m.model, mode: "insensitive" as const } },
      ],
    })),
  };
}

export async function resolveCategorySlugForCar(make: string, model: string): Promise<string | null> {
  const categories = await listHomepageCategories();
  for (const category of categories) {
    if (category.isActive === false) continue;
    if (carMatchesMappedModels(make, model, category.mappedModels)) return category.slug;
  }
  return null;
}

/** Accept an explicit partner-selected slug only when that category is enabled. */
export async function normalizePartnerCategorySlug(
  slug: string | null | undefined,
): Promise<string | null> {
  const value = String(slug || "").trim();
  if (!value) return null;
  const categories = await listHomepageCategories();
  const match = categories.find((c) => c.slug === value && c.isActive !== false);
  return match?.slug ?? null;
}
