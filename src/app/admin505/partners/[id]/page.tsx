import { requireAdmin } from "@/lib/auth/guards";
import { AdminPartnerReviewPanel } from "@/components/admin/admin-partner-review-panel";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminPartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ returnTab?: string }>;
}) {
  await requireAdmin();
  const resolved = await Promise.resolve(params);
  const id = decodeURIComponent(resolved.id);
  const sp = await searchParams;
  const returnTab = sp.returnTab?.trim().toLowerCase();

  let backHref = `${ADMIN_BASE}/partners`;
  if (returnTab === "private" || returnTab === "rejected" || returnTab === "company") {
    backHref = `${ADMIN_BASE}/partners?partnerTab=${encodeURIComponent(returnTab)}`;
  }

  return (
    <AdminPartnerReviewPanel
      partnerId={id}
      backHref={backHref}
      backLabel="← პარტნიორები"
      editable
    />
  );
}
