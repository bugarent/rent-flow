import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { IntegrationsManager } from "@/components/admin/integrations-manager";
import { listIntegrations } from "@/lib/integrations/repository";
import { AdminLoading, AdminPageHeading, AdminSandboxLink } from "@/components/admin/admin-page-heading";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { listFilePartnerApplications } from "@/lib/server/partner-applications-store";
import { ADMIN_BASE } from "@/lib/routes";

export default async function AdminIntegrationsPage() {
  await requireAdmin();
  const { items, source } = await listIntegrations();

  const partnerOptions: Array<{ id: string; label: string }> = [];
  try {
    const partners = await prisma.partner.findMany({
      where: { status: { in: ["APPROVED", "PENDING_REMODERATION", "INVITED"] } },
      select: { id: true, companyName: true, email: true },
      orderBy: { companyName: "asc" },
      take: 200,
    });
    for (const p of partners) {
      partnerOptions.push({ id: p.id, label: `${p.companyName} (${p.email})` });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations page] partners", error);
  }

  try {
    const filePartners = await listFilePartnerApplications();
    for (const p of filePartners) {
      if (!partnerOptions.some((o) => o.id === p.id)) {
        partnerOptions.push({
          id: p.id,
          label: `${p.companyName || p.contactName} (${p.email}) [file]`,
        });
      }
    }
  } catch {
    /* ignore */
  }

  const local = loadLocalPartner();
  if (!partnerOptions.some((o) => o.id === LOCAL_PARTNER_ID || o.id === local?.id)) {
    partnerOptions.unshift({
      id: local?.id || LOCAL_PARTNER_ID,
      label: `${local?.companyName || "Local partner"} (offline)`,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <AdminPageHeading
            page="integrations"
            className=""
            titleClassName="mb-2 text-3xl font-extrabold"
            bodyClassName="text-sm text-slate-600"
          />
        </div>
        <AdminSandboxLink href={`${ADMIN_BASE}/integrations/sandbox`} />
      </div>

      {source === "file" ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Database offline — using local integration store (.data/integrations.json).
        </div>
      ) : null}

      <Suspense fallback={<AdminLoading />}>
        <IntegrationsManager initialIntegrations={items} partnerOptions={partnerOptions} />
      </Suspense>
    </div>
  );
}
