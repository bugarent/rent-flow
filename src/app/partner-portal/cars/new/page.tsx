import { PartnerCreateCarForm } from "@/components/partner/partner-create-car-form";
import { requirePartner } from "@/lib/auth/guards";
import { loadPartnerCarFormInitial } from "@/lib/server/partner-car-form-initial";

export default async function NewCarPage({
  searchParams,
}: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const session = await requirePartner();
  const { clone } = await searchParams;
  const cloneFromId = String(clone || "").trim();
  const {
    initialDeliveryCatalog,
    initialExtrasCatalog,
    initialExtraPrefs,
    initialTariffs,
    initialMinRentalDays,
    initialCategories,
  } = await loadPartnerCarFormInitial(session.user);

  return (
    <PartnerCreateCarForm
      initialDeliveryCatalog={initialDeliveryCatalog}
      initialExtrasCatalog={initialExtrasCatalog}
      initialExtraPrefs={initialExtraPrefs}
      initialTariffs={initialTariffs}
      initialMinRentalDays={initialMinRentalDays}
      initialCategories={initialCategories}
      cloneFromId={cloneFromId || undefined}
    />
  );
}
