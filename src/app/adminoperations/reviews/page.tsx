import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { ADMIN_BASE } from "@/lib/routes";

/** Reviews now live as a tab inside Moderation. */
export default async function AdminReviewsPage() {
  await requireAdmin();
  redirect(`${ADMIN_BASE}/moderation?tab=reviews`);
}
