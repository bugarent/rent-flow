import { requirePartner } from "@/lib/auth/guards";
import { PartnerDiscountsPanel } from "@/components/partner/partner-discounts-panel";

export default async function PartnerDiscountsPage() {
  await requirePartner();
  return <PartnerDiscountsPanel />;
}
