import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";

export default function AdminBusinessPartnersCountriesRedirect() {
  redirect(`${ADMIN_BASE}/business-partners?tab=invoice`);
}
