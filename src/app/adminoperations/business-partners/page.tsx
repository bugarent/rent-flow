import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { BusinessPartnersShell } from "@/components/admin/business-partners/shell";
import { AdminLoading, AdminPageHeading } from "@/components/admin/admin-page-heading";

export default async function AdminBusinessPartnersPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeading
        page="businessPartners"
        className="mb-6"
        titleClassName="mb-2 text-3xl font-extrabold"
        bodyClassName="text-sm text-slate-600"
      />
      <Suspense fallback={<AdminLoading />}>
        <BusinessPartnersShell />
      </Suspense>
    </div>
  );
}
