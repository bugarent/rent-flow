import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";

export default function AdminBusinessPartnersStatsRedirect() {
  redirect(`${ADMIN_BASE}/business-partners?tab=stats`);
}
