import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { ADMIN_BASE } from "@/lib/routes";

/** Search countries now lives inside Homepage content at /adminoperations. */
export default async function AdminHomepageSearchPage() {
  await requireAdmin();
  redirect(ADMIN_BASE);
}
