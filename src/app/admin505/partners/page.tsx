import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { PartnersManager } from "@/components/admin/partners-manager";
import { readAdminLocale } from "@/lib/server/admin-preferences";
import { getAdminDictionary } from "@/lib/i18n/admin-dictionaries";
import {
  filterDirectoryPartners,
  loadAdminPartnerRows,
} from "@/lib/server/admin-partner-rows";

export default async function AdminPartnersPage() {
  await requireAdmin();
  const locale = await readAdminLocale();
  const t = getAdminDictionary(locale);
  const partnerRows = await loadAdminPartnerRows();
  const partners = filterDirectoryPartners(partnerRows.partners);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">{t.common.loading}</div>
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-extrabold text-[#0b1f4b]">{t.pages.partners.title}</h1>
        <p className="mb-5 text-sm text-slate-600">{t.pages.partners.body}</p>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {(partnerRows.dbOffline || partnerRows.queryError) && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="font-semibold">
                {partnerRows.dbOffline
                  ? "Partner list could not be loaded from the online database"
                  : "Could not load partners"}
              </p>
              {partnerRows.queryError ? (
                <p className="mt-1 leading-relaxed">{partnerRows.queryError}</p>
              ) : null}
            </div>
          )}
          <PartnersManager initialPartners={partners} mode="directory" />
        </section>
      </div>
    </Suspense>
  );
}
