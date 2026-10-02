import { hashSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { nextPartnerSequentialNumber, PORTAL_ID_START } from "@/lib/sequential-ids";
import { findStoredPartnerPassword, getPartnerCredentials } from "@/lib/server/partner-credentials-store";
import { partnerCanAccessPortal } from "@/lib/auth/partner-access";

type MessengerName = "WHATSAPP" | "VIBER" | "TELEGRAM";

export type ActivatePartnerLoginResult =
  | { ok: true; partnerId: string; email: string }
  | { ok: false; reason: "no-password" | "email-taken" };

function firstNameOf(contactName: string, representativeFirstName: string | null) {
  return (representativeFirstName || contactName.split(/\s+/)[0] || "Partner").trim() || "Partner";
}

function lastNameOf(contactName: string, representativeLastName: string | null) {
  return (
    representativeLastName ||
    contactName.split(/\s+/).slice(1).join(" ") ||
    "Account"
  ).trim() || "Account";
}

function asMessenger(value: unknown): MessengerName {
  if (value === "VIBER" || value === "TELEGRAM" || value === "WHATSAPP") return value;
  return "WHATSAPP";
}

/**
 * When an application stored a password, approval creates the cabinet login
 * (vendor user + APPROVED partner) instead of sending a second registration invite.
 */
export async function activatePartnerFromStoredPassword(partnerId: string): Promise<ActivatePartnerLoginResult> {
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return { ok: false, reason: "no-password" };

  const stored = await getPartnerCredentials(partnerId);
  const password =
    stored?.password?.trim() ||
    (await findStoredPartnerPassword(partnerId, partner.email));
  if (!password) return { ok: false, reason: "no-password" };

  const email = partner.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && existingUser.role !== "VENDOR") {
    return { ok: false, reason: "email-taken" };
  }
  if (existingUser?.role === "VENDOR") {
    const owner = await prisma.partner.findUnique({ where: { userId: existingUser.id } });
    if (owner && owner.id !== partner.id) return { ok: false, reason: "email-taken" };
  }

  const passwordHash = hashSecret(password);
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
          firstName: firstNameOf(partner.contactName, partner.representativeFirstName),
          lastName: lastNameOf(partner.contactName, partner.representativeLastName),
          phone: partner.phone,
          countryOfResidence: (partner.phoneCountryIso2 || "GE").toUpperCase(),
          preferredMessenger: asMessenger(partner.messenger),
        },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          firstName: firstNameOf(partner.contactName, partner.representativeFirstName),
          lastName: lastNameOf(partner.contactName, partner.representativeLastName),
          phone: partner.phone,
          countryOfResidence: (partner.phoneCountryIso2 || "GE").toUpperCase(),
          preferredMessenger: asMessenger(partner.messenger),
          messengers: partner.messengers ?? [],
        },
      });

  let sequentialNumber = partner.sequentialNumber;
  if (!sequentialNumber || sequentialNumber < PORTAL_ID_START) {
    sequentialNumber = await nextPartnerSequentialNumber();
  }

  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      userId: user.id,
      email,
      status: "APPROVED",
      approvedAt: new Date(),
      sequentialNumber,
      rejectionNote: null,
      inviteToken: null,
      inviteTokenExpiresAt: null,
    },
  });

  return { ok: true, partnerId: partner.id, email };
}

/**
 * After approval, the application email and password are the cabinet login.
 * If the user row was never created, or its hash is stale, open it now.
 */
export async function signInApprovedPartnerWithStoredPassword(email: string, password: string) {
  const login = email.trim().toLowerCase();
  const plain = password;
  if (!login || !plain) return null;

  const partners = await prisma.partner.findMany({
    where: { email: { equals: login, mode: "insensitive" } },
  });
  const partner = partners.find((row) => partnerCanAccessPortal(row.status));
  if (!partner) return null;

  const stored = await findStoredPartnerPassword(partner.id, login);
  if (!stored || stored !== plain) return null;

  const activated = await activatePartnerFromStoredPassword(partner.id);
  if (!activated.ok) return null;

  const user = await prisma.user.findUnique({ where: { email: login } });
  if (!user || user.status !== "ACTIVE" || user.role !== "VENDOR") return null;

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
  };
}
