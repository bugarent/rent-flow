import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { requireAdmin } from "@/lib/auth/guards";
import { DeliveryLocationsManager } from "@/components/admin/delivery-locations-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { getFxRates } from "@/lib/server/preferences";

export default async function AdminDeliveryLocationsPage() {
  await requireAdmin();

  let locations: Awaited<ReturnType<typeof listDeliveryLocations>> = [];
  let queryError = "";
  const fxRates = await getFxRates();

  try {
    locations = await listDeliveryLocations();
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
      <DeliveryLocationsManager initialLocations={locations} fxRates={fxRates} />
    </div>
  );
}
