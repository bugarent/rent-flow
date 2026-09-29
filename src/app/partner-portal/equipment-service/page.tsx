import { requirePartner } from "@/lib/auth/guards";
import { PartnerEquipmentServicePanel } from "@/components/partner/partner-equipment-service-panel";
import { listExtraServices } from "@/lib/server/extras-store";

export default async function PartnerEquipmentServicePage() {
  await requirePartner();
  let catalog: Awaited<ReturnType<typeof listExtraServices>> = [];
  try {
    catalog = await listExtraServices({ activeOnly: true });
  } catch {
    catalog = [];
  }
  return <PartnerEquipmentServicePanel catalog={catalog} />;
}
