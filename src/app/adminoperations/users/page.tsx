import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminUsersPage() {
  await requireAdmin();
  redirect(`${ADMIN_BASE}/bookings?tab=users`);
}
