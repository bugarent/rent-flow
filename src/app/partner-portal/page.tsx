import { requirePartner } from "@/lib/auth/guards";
import { PartnerFleetCalendar } from "@/components/partner/partner-fleet-calendar";

/** Default landing after partner login: fleet booking calendar. */
export default async function PartnerPortalHomePage() {
  await requirePartner();
  return <PartnerFleetCalendar />;
}
