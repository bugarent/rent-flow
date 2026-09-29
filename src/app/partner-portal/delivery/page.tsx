import { requirePartner } from "@/lib/auth/guards";
import { PartnerDeliveryPanel } from "@/components/partner/partner-delivery-panel";

export default async function PartnerDeliveryPage() {
  await requirePartner();
  return <PartnerDeliveryPanel />;
}
