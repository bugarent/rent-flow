import { requireAdmin } from "@/lib/auth/guards";
import { AdminCarsPanel } from "@/components/admin/admin-cars-panel";
import { loadAdminCarRows } from "@/lib/server/load-admin-cars";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage() {
  await requireAdmin();
  const { cars, dbOffline } = await loadAdminCarRows();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminCarsPanel cars={cars} dbOffline={dbOffline} />
    </div>
  );
}
