import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { ADMIN_BASE } from "@/lib/routes";

/** Legacy URL — online chat inbox now lives under Bookings. */
export default async function AdminCustomBookingPage() {
  await requireAdmin();
  redirect(`${ADMIN_BASE}/bookings`);
}
