import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { buildReferralAbsoluteUrl } from "@/lib/business-partner/codes";
import type { BusinessPartner } from "@/lib/catalog/business-partners";
import {
  getBusinessPartnerById,
  listBusinessPartnerEarnings,
  unpaidBalanceUsd,
} from "@/lib/server/business-partners-store";

export const BP_SESSION_COOKIE = "bp_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const fromEnv =
    process.env.BUSINESS_PARTNER_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET (or BUSINESS_PARTNER_SESSION_SECRET) is required in production");
  }
  return "rentairportcars-bp-dev-secret";
}

function sign(partnerId: string): string {
  const sig = createHmac("sha256", secret()).update(partnerId).digest("base64url");
  return `${partnerId}.${sig}`;
}

function verify(token: string): string | null {
  const [partnerId, sig] = token.split(".");
  if (!partnerId || !sig) return null;
  const expected = createHmac("sha256", secret()).update(partnerId).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return partnerId;
  } catch {
    return null;
  }
}

export async function setBusinessPartnerSession(partnerId: string) {
  const jar = await cookies();
  jar.set(BP_SESSION_COOKIE, sign(partnerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearBusinessPartnerSession() {
  const jar = await cookies();
  jar.delete(BP_SESSION_COOKIE);
}

export async function getBusinessPartnerSessionId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(BP_SESSION_COOKIE)?.value || "";
  if (!raw) return null;
  return verify(raw);
}

export async function getBusinessPartnerSession(): Promise<BusinessPartner | null> {
  const id = await getBusinessPartnerSessionId();
  if (!id) return null;
  const partner = await getBusinessPartnerById(id);
  if (!partner) return null;
  if (partner.status !== "ACTIVE" && partner.status !== "DISABLED") return null;
  return partner;
}

export async function partnerCabinetPayload(partner: BusinessPartner, origin: string) {
  const unpaidUsd = unpaidBalanceUsd(partner);
  const earnings = await listBusinessPartnerEarnings(partner.id, 40);
  return {
    partner: {
      id: partner.id,
      fullName: partner.fullName,
      email: partner.email,
      phone: partner.phone,
      messengers: partner.messengers || [],
      category: partner.category,
      website: partner.website || "",
      notes: partner.notes || "",
      personalId: partner.personalId || "",
      payoutMethod: partner.payoutMethod || "BANK",
      payoutAccount: partner.payoutAccount || "",
      payoutSwift: partner.payoutSwift || "",
      paypalAccount: partner.paypalAccount || "",
      referralCode: partner.referralCode,
      status: partner.status,
      countryIso2: partner.countryIso2,
      referralBookings: partner.referralBookings,
      earnedUsd: partner.earnedUsd,
      paidUsd: partner.paidUsd,
      unpaidUsd,
    },
    referralUrl: buildReferralAbsoluteUrl(origin, partner.referralCode),
    earnings: earnings.map((e) => ({
      id: e.id,
      bookingRef: e.bookingRef,
      amountUsd: e.amountUsd,
      siteEarnedUsd: e.siteEarnedUsd,
      paidUsd: e.paidUsd,
      unpaidUsd: Math.max(0, e.amountUsd - e.paidUsd),
      airport: e.airport,
      customerName: e.customerName,
      customerEmail: e.customerEmail,
      customerFirstName: e.customerFirstName,
      customerLastName: e.customerLastName,
      createdAt: e.createdAt,
    })),
  };
}
