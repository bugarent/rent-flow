import { notFound, redirect } from "next/navigation";
import { getAdminSession, getCustomerSession, getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { ADMIN_LOGIN, PARTNER_LOGIN } from "@/lib/routes";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect(ADMIN_LOGIN);
  }
  if (session.user.role !== "ADMIN") {
    notFound();
  }
  return session;
}

export async function requirePartner() {
  const session = await getPartnerSession();
  const role = session?.user?.role;
  if (!session?.user) {
    redirect(PARTNER_LOGIN);
  }
  if (session.user.id === LOCAL_PARTNER_ID) {
    return session;
  }
  if (role !== "VENDOR") {
    notFound();
  }
  try {
    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
    const { partnerCanAccessPortal } = await import("@/lib/auth/partner-access");
    if (!partner || !partnerCanAccessPortal(partner.status)) {
      redirect(`${PARTNER_LOGIN}?registered=1`);
    }
  } catch {
    /* local fallback */
  }
  return session;
}

export async function requireCustomer() {
  const session = await getCustomerSession();
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.role !== "CUSTOMER") {
    redirect("/");
  }
  return session;
}
