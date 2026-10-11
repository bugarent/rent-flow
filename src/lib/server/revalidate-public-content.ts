import "server-only";

import { revalidatePath } from "next/cache";

/** Drop cached public pages after an admin content save. */
export function revalidatePublishedContent() {
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
