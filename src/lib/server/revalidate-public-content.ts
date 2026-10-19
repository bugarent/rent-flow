import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/server/public-data-cache";
import { clearSearchCatalog } from "@/lib/server/search-catalog";

/** Drop cached public data so the next request reads fresh content. */
export function revalidatePublicData() {
  clearSearchCatalog();
  try {
    revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
  } catch (error) {
    console.warn("[revalidate] public data", error);
  }
}

/** Drop cached public pages after an admin content save. */
export function revalidatePublishedContent() {
  revalidatePublicData();
  try {
    revalidatePath("/", "layout");
    revalidatePath("/cars");
    revalidatePath("/terms");
    revalidatePath("/privacy");
    revalidatePath("/contact");
    revalidatePath("/about");
    revalidatePath("/help");
  } catch (error) {
    console.warn("[revalidate] public content", error);
  }
}

/** Search and the listing page must show an admin correction on the next request. */
export function revalidatePublishedListing(carId?: string) {
  revalidatePublishedContent();
  if (!carId) return;
  try {
    revalidatePath(`/cars/${carId}`);
  } catch (error) {
    console.warn("[revalidate] listing", carId, error);
  }
}
