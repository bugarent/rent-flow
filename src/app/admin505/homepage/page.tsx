import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";

/** Homepage content now lives at /admin505 — keep old URL working. */
export default function AdminHomepageRedirectPage() {
  redirect(ADMIN_BASE);
}
