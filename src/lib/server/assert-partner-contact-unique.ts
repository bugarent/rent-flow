import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFilePartnerApplications } from "@/lib/server/partner-applications-store";

export const EMAIL_EXISTS_CODE = "EMAIL_EXISTS";
export const PHONE_EXISTS_CODE = "PHONE_EXISTS";

const ACTIVE_PARTNER_STATUSES = [
  "PENDING",
  "INVITED",
  "PENDING_FINAL",
  "NEEDS_CORRECTION",
  "APPROVED",
] as const;

function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function phonesMatch(a: string, b: string) {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  if (da === db) return true;
  // Compare last 9 digits (local mobile) when country prefixes differ in storage.
  const ta = da.length > 9 ? da.slice(-9) : da;
  const tb = db.length > 9 ? db.slice(-9) : db;
  return ta.length >= 8 && ta === tb;
}

export type PartnerContactConflict =
  | { kind: "email"; code: typeof EMAIL_EXISTS_CODE; error: string }
  | { kind: "phone"; code: typeof PHONE_EXISTS_CODE; error: string };

/**
 * Blocks a new partner application when the same email or phone is already
 * tied to a user account or an active/pending partner profile.
 * Re-apply on the same pending/rejected window is handled separately by the caller.
 */
export async function findPartnerContactConflict(opts: {
  email: string;
  phone: string;
  secondaryPhone?: string | null;
  /** Skip this partner id (re-apply / update). */
  excludePartnerId?: string;
}): Promise<PartnerContactConflict | null> {
  const email = String(opts.email || "")
    .trim()
    .toLowerCase();
  const phone = String(opts.phone || "").trim();
  const secondary = String(opts.secondaryPhone || "").trim();
  const phones = [phone, secondary].filter(Boolean);

  try {
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        return {
          kind: "email",
          code: EMAIL_EXISTS_CODE,
          error: "An account with this email already exists. Please log in to the partner portal.",
        };
      }

      const emailPartner = await prisma.partner.findFirst({
        where: {
          email,
          status: { in: [...ACTIVE_PARTNER_STATUSES] },
          ...(opts.excludePartnerId ? { id: { not: opts.excludePartnerId } } : {}),
        },
        select: { id: true },
      });
      if (emailPartner) {
        return {
          kind: "email",
          code: EMAIL_EXISTS_CODE,
          error: "An application with this email is already registered.",
        };
      }
    }

    if (phones.length) {
      const phonePartners = await prisma.partner.findMany({
        where: {
          status: { in: [...ACTIVE_PARTNER_STATUSES] },
          ...(opts.excludePartnerId ? { id: { not: opts.excludePartnerId } } : {}),
          OR: [
            { phone: { in: phones } },
            { secondaryPhone: { in: phones } },
          ],
        },
        select: { id: true, phone: true, secondaryPhone: true },
        take: 40,
      });
      const phoneHit = phonePartners.find(
        (p) =>
          phones.some((ph) => phonesMatch(ph, p.phone)) ||
          phones.some((ph) => phonesMatch(ph, p.secondaryPhone || "")),
      );
      if (phoneHit) {
        return {
          kind: "phone",
          code: PHONE_EXISTS_CODE,
          error: "A partner with this phone number is already registered.",
        };
      }

      const usersWithPhone = await prisma.user.findMany({
        where: { phone: { in: phones } },
        select: { id: true, phone: true },
        take: 20,
      });
      if (usersWithPhone.some((u) => phones.some((ph) => phonesMatch(ph, u.phone)))) {
        return {
          kind: "phone",
          code: PHONE_EXISTS_CODE,
          error: "A partner with this phone number is already registered.",
        };
      }
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  try {
    const filePartners = await listFilePartnerApplications();
    for (const p of filePartners) {
      if (opts.excludePartnerId && p.id === opts.excludePartnerId) continue;
      if (!ACTIVE_PARTNER_STATUSES.includes(p.status as (typeof ACTIVE_PARTNER_STATUSES)[number])) {
        continue;
      }
      if (email && p.email.trim().toLowerCase() === email) {
        return {
          kind: "email",
          code: EMAIL_EXISTS_CODE,
          error: "An application with this email is already registered.",
        };
      }
      if (
        phones.some(
          (ph) => phonesMatch(ph, p.phone) || phonesMatch(ph, p.secondaryPhone || ""),
        )
      ) {
        return {
          kind: "phone",
          code: PHONE_EXISTS_CODE,
          error: "A partner with this phone number is already registered.",
        };
      }
    }
  } catch {
    /* optional */
  }

  return null;
}
