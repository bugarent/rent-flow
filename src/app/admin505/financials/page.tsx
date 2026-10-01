import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { ADMIN_BASE } from "@/lib/routes";

/** Legacy URL — financials now lives under Bookings tabs. */
export default async function AdminFinancialsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; country?: string; year?: string; month?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const qs = new URLSearchParams({ tab: "financials" });
  for (const key of ["from", "to", "country", "year", "month"] as const) {
    const v = sp[key]?.trim();
    if (v) qs.set(key, v);
  }
  redirect(`${ADMIN_BASE}/bookings?${qs.toString()}`);
}
