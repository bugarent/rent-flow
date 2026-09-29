import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";

export default function AdminBusinessPartnersListRedirect() {
  redirect(`${ADMIN_BASE}/business-partners?tab=list`);
}
