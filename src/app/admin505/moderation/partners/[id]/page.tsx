import { requireAdmin } from "@/lib/auth/guards";
import { AdminPartnerReviewPanel } from "@/components/admin/admin-partner-review-panel";
import { AdminProfileRemoderationPanel } from "@/components/admin/admin-profile-remodeation-panel";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminPartnerModerationReviewPage({
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
  let backLabel = "← პარტნიორები";
  if (returnTab === "profiles") {
    backHref = `${ADMIN_BASE}/moderation?tab=profiles`;
    backLabel = "← პროფილები";
  } else if (returnTab === "primary") {
    backHref = `${ADMIN_BASE}/moderation?tab=primary`;
    backLabel = "← პირველადი მოდერაცია";
  } else if (returnTab === "company" || returnTab === "private" || returnTab === "rejected") {
    backHref = `${ADMIN_BASE}/partners?partnerTab=${encodeURIComponent(returnTab)}`;
  }

  if (returnTab === "profiles") {
    return (
      <AdminProfileRemoderationPanel
        partnerId={id}
        backHref={backHref}
        backLabel={backLabel}
      />
    );
  }

  return (
    <AdminPartnerReviewPanel
      partnerId={id}
      backHref={backHref}
      backLabel={backLabel}
      editable
    />
  );
}
