import "server-only";

import { revalidatePath } from "next/cache";

/** Drop cached public pages after an admin content save. */
export function revalidatePublishedContent() {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/terms");
    revalidatePath("/privacy");
    revalidatePath("/contact");
    revalidatePath("/about");
    revalidatePath("/help");
  } catch (error) {
    console.warn("[revalidate] public content", error);
  }
}
