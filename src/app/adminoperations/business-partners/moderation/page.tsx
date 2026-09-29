import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";

export default function AdminBusinessPartnersModerationRedirect() {
  redirect(`${ADMIN_BASE}/business-partners?tab=moderation`);
}
