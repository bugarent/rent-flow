import { requireAdmin } from "@/lib/auth/guards";
import { AdminPartnerReviewPanel } from "@/components/admin/admin-partner-review-panel";
import { AdminProfileRemoderationPanel } from "@/components/admin/admin-profile-remodeation-panel";
import { ADMIN_BASE } from "@/lib/routes";
import { directoryPartnerTabQuery } from "@/lib/admin/partner-directory-tabs";

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
  let backTarget: "partners" | "profiles" | "primary" = "partners";
  if (returnTab === "profiles") {
    backHref = `${ADMIN_BASE}/moderation?tab=profiles`;
    backTarget = "profiles";
  } else if (returnTab === "primary") {
    backHref = `${ADMIN_BASE}/moderation?tab=primary`;
    backTarget = "primary";
  } else {
    const partnerTabs = directoryPartnerTabQuery(returnTab);
    if (partnerTabs) {
      backHref = `${ADMIN_BASE}/partners?partnerTab=${encodeURIComponent(partnerTabs)}`;
    }
  }

  if (returnTab === "profiles") {
    return (
      <AdminProfileRemoderationPanel
        partnerId={id}
        backHref={backHref}
        backTarget={backTarget}
      />
    );
  }

  return (
    <AdminPartnerReviewPanel
      partnerId={id}
      backHref={backHref}
      backTarget={backTarget}
      editable
    />
  );
}
