import { requireAdmin } from "@/lib/auth/guards";
import { IntegrationSandboxPanel } from "@/components/admin/integration-sandbox";
import { AdminIntegrationsBackLink, AdminPageHeading } from "@/components/admin/admin-page-heading";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminIntegrationsSandboxPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminIntegrationsBackLink href={`${ADMIN_BASE}/integrations`} />
      <AdminPageHeading
        page="integrationsSandbox"
        className="mt-3 mb-6"
        titleClassName="mb-2 text-3xl font-extrabold"
        bodyClassName="text-sm text-slate-600"
      />
      <IntegrationSandboxPanel />
    </div>
  );
}
