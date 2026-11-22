import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listExtraServices, scheduleExtraCopyTranslations } from "@/lib/server/extras-store";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { readTplPartnerChoiceCountries } from "@/lib/server/tpl-partner-choice-store";
import { ExtrasManager } from "@/components/admin/extras-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export default async function AdminExtrasPage() {
  await requireAdmin();

  after(() => scheduleExtraCopyTranslations());
  const [extras, locations, tplChoiceIso2s] = await Promise.all([
    listExtraServices(),
    listDeliveryLocations({ activeOnly: true }).catch(() => []),
    readTplPartnerChoiceCountries().catch(() => []),
  ]);
  const seen = new Set<string>();
  const tplCountries = [];
  for (const location of locations) {
    const iso2 = String(location.countryIso2 || "").trim().toUpperCase();
    if (iso2.length !== 2 || seen.has(iso2)) continue;
    seen.add(iso2);
    tplCountries.push({ iso2 });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeading
        page="extras"
        className="mb-8"
        titleClassName="mb-2 text-3xl font-extrabold"
        bodyClassName="text-sm text-slate-600"
      />
      <ExtrasManager
        initialExtras={extras}
        tplCountries={tplCountries}
        initialTplChoiceIso2s={tplChoiceIso2s}
      />
    </div>
  );
}
