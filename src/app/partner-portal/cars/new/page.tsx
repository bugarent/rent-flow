import { PartnerCreateCarForm } from "@/components/partner/partner-create-car-form";
import { requirePartner } from "@/lib/auth/guards";
import { loadPartnerCarFormInitial } from "@/lib/server/partner-car-form-initial";

export default async function NewCarPage() {
  const session = await requirePartner();
  const { initialDeliveryCatalog, initialExtrasCatalog } = await loadPartnerCarFormInitial(
    session.user,
  );

  return (
    <PartnerCreateCarForm
      initialDeliveryCatalog={initialDeliveryCatalog}
      initialExtrasCatalog={initialExtrasCatalog}
    />
  );
}
