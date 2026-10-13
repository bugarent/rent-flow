import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { syncListedPartnerDeliveryLocations } from "@/lib/server/partner-search-coverage";
import { bookablePlaceKeys } from "@/lib/server/search-place-coverage";
import { resetLegacyAutoDeliveryLimits } from "@/lib/server/delivery-price-limit";
import { requireAdmin } from "@/lib/auth/guards";
import { DeliveryLocationsManager } from "@/components/admin/delivery-locations-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { getFxRates } from "@/lib/server/preferences";

export default async function AdminDeliveryLocationsPage() {
  await requireAdmin();

  let locations: Awaited<ReturnType<typeof listDeliveryLocations>> = [];
  let deliverableKeys: string[] = [];
  let queryError = "";
  const fxRates = await getFxRates();

  try {
    await syncListedPartnerDeliveryLocations();
    await resetLegacyAutoDeliveryLimits();
    locations = await listDeliveryLocations();
    const keys = await bookablePlaceKeys(locations).catch((error) => {
      console.error("[admin/delivery page] deliverable places", error);
      return new Set<string>();
    });
    deliverableKeys = [...keys];
  } catch (error) {
    console.error("[admin/delivery page]", error);
    queryError =
      "Could not load delivery locations (database may be offline). Start Postgres and run prisma db push, then refresh.";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminPageHeading
        page="delivery"
        className="mb-8"
        titleClassName="mb-2 text-3xl font-extrabold"
        bodyClassName="text-sm text-slate-600"
      />
      {queryError ? (
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {queryError}
        </p>
      ) : null}
      <DeliveryLocationsManager
        initialLocations={locations}
        fxRates={fxRates}
        deliverableKeys={deliverableKeys}
      />
    </div>
  );
}
