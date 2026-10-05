import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "statistics");
  if (sp.from) params.set("from", sp.from);
  if (sp.to) params.set("to", sp.to);
  redirect(`${ADMIN_BASE}/bookings?${params.toString()}`);
}
