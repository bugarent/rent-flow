import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";

/** Homepage content now lives at /adminoperations — keep old URL working. */
export default function AdminHomepageRedirectPage() {
  redirect(ADMIN_BASE);
}
