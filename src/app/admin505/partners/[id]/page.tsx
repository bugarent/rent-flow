import { requireAdmin } from "@/lib/auth/guards";
import { AdminPartnerReviewPanel } from "@/components/admin/admin-partner-review-panel";
import { ADMIN_BASE } from "@/lib/routes";
import { directoryPartnerTabQuery } from "@/lib/admin/partner-directory-tabs";

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

  const partnerTabs = directoryPartnerTabQuery(returnTab);
  const backHref = partnerTabs
    ? `${ADMIN_BASE}/partners?partnerTab=${encodeURIComponent(partnerTabs)}`
    : `${ADMIN_BASE}/partners`;

  return (
    <AdminPartnerReviewPanel
      partnerId={id}
      backHref={backHref}
      backTarget="partners"
      editable
    />
  );
}
