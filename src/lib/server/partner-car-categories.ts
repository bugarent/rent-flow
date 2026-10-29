import "server-only";

import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { listHomepageCategories } from "@/lib/server/homepage-categories-store";

export type PartnerCarCategoryOption = { id: string; slug: string; name: string };

const BUILT_IN: PartnerCarCategoryOption[] = VEHICLE_CATEGORIES.map((c) => ({
  id: c.id,
  slug: c.id,
  name: c.name,
}));

/**
 * Active categories for the partner car form. A slow or empty category read must not leave the
 * dropdown with only “Select”, so the built-in categories stand in.
 */
export async function listPartnerCarCategoryOptions(): Promise<PartnerCarCategoryOption[]> {
  try {
    const rows = await listHomepageCategories();
    const active = rows
      .filter((c) => c.isActive !== false && c.slug)
      .map((c) => ({ id: String(c.id || c.slug), slug: c.slug, name: c.name || c.slug }));
    return active.length ? active : BUILT_IN;
  } catch {
    return BUILT_IN;
  }
}
