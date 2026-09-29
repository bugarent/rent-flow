import { getServerSession } from "next-auth";
import { adminAuthOptions, customerAuthOptions, partnerAuthOptions } from "@/lib/auth";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";

export { getPortalToken } from "@/lib/auth/portals";

export async function getCustomerSession() {
  return getServerSession(customerAuthOptions);
}

export async function getAdminSession() {
  return getServerSession(adminAuthOptions);
}

export async function getPartnerSession() {
  return getServerSession(partnerAuthOptions);
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function requirePartnerApi() {
  const session = await getPartnerSession();
  if (!session?.user) return null;
  if (session.user.id === LOCAL_PARTNER_ID) return session;
  if (session.user.role !== "VENDOR") return null;
  return session;
}
