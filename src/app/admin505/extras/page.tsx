import { requireAdmin } from "@/lib/auth/guards";
import { listExtraServices } from "@/lib/server/extras-store";
import { ExtrasManager } from "@/components/admin/extras-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export default async function AdminExtrasPage() {
  await requireAdmin();

  const extras = await listExtraServices();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeading
        page="extras"
        className="mb-8"
        titleClassName="mb-2 text-3xl font-extrabold"
        bodyClassName="text-sm text-slate-600"
      />
      <ExtrasManager initialExtras={extras} />
    </div>
  );
}
