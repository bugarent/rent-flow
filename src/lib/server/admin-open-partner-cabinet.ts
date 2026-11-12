import "server-only";

import { normalizeLogin } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { loadLocalPartner, LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";

export type CabinetUser = { id: string; email: string; name: string };

async function vendorByEmail(email: string): Promise<CabinetUser | null> {
  const login = normalizeLogin(email || "");
  if (!login) return null;
  const user = await prisma.user.findFirst({ where: { email: login, role: "VENDOR" } });
  return user ? { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim() } : null;
}

/**
 * The login behind a partner's cabinet, for database partners, `file-partner-<userId>` partners,
 * file applications and the local test partner. Null when the partner has no cabinet account yet.
 */
export async function cabinetUserForPartner(partnerId: string): Promise<CabinetUser | null> {
  const id = String(partnerId || "").trim();
  if (!id) return null;

  const local = loadLocalPartner();
  if (id === LOCAL_PARTNER_ID || (local && id === local.id)) {
    return local ? { id: local.id, email: local.email, name: "Test Partner" } : null;
  }

  const partner = await prisma.partner.findUnique({ where: { id }, include: { user: true } });
  if (partner) {
    if (partner.user?.role === "VENDOR") {
      const u = partner.user;
      return { id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`.trim() };
    }
    return vendorByEmail(partner.email || "");
  }

  if (id.startsWith("file-partner-")) {
    const user = await prisma.user.findUnique({ where: { id: id.slice("file-partner-".length) } });
    if (user?.role === "VENDOR") {
      return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim() };
    }
  }

  const { getFilePartnerById } = await import("@/lib/server/partner-applications-store");
  const file = await getFilePartnerById(id);
  return file ? vendorByEmail(file.email) : null;
}
