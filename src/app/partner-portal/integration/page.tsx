import { requirePartner } from "@/lib/auth/guards";
import { PartnerIntegrationPanel } from "@/components/partner/partner-integration-panel";

export default async function PartnerIntegrationPage() {
  await requirePartner();
  return <PartnerIntegrationPanel />;
}
