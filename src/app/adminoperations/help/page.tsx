import { requireAdmin } from "@/lib/auth/guards";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { HelpCenterManager } from "@/components/admin/help-center-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export default async function AdminHelpPage() {
  await requireAdmin();

  const helpCenter = await getHelpCenterConfig();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminPageHeading
        page="help"
        className="mb-8"
        titleClassName="mb-2 text-3xl font-extrabold text-[#0b1f4b]"
        bodyClassName="text-sm text-slate-600"
      />
      <HelpCenterManager initial={helpCenter} />
    </div>
  );
}
