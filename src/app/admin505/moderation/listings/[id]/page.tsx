import { requireAdmin } from "@/lib/auth/guards";
import { AdminListingReviewPanel } from "@/components/admin/admin-listing-review-panel";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminListingModerationReviewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  await requireAdmin();
  const resolved = await Promise.resolve(params);
  const id = decodeURIComponent(resolved.id);

  return (
    <AdminListingReviewPanel
      carId={id}
      backHref={`${ADMIN_BASE}/moderation?tab=listings`}
    />
  );
}
