import { redirect } from "next/navigation";
import { PARTNER_BASE } from "@/lib/routes";

/** Account section removed — personal info is the partner profile surface. */
export default function PartnerAccountPage() {
  redirect(`${PARTNER_BASE}/personal-info`);
}
