import { PartnerCreateCarForm } from "@/components/partner/partner-create-car-form";
import { requirePartner } from "@/lib/auth/guards";
import { loadPartnerCarFormInitial } from "@/lib/server/partner-car-form-initial";

export default async function NewCarPage() {
  const session = await requirePartner();
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
    />
  );
}
