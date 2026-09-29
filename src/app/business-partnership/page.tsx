import { redirect } from "next/navigation";

/** Canonical URL is /partnership — keep old path as alias. */
export default function BusinessPartnershipAliasPage() {
  redirect("/partnership");
}
