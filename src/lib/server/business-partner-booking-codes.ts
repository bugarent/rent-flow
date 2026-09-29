import "server-only";

import { normalizeReferralCode } from "@/lib/business-partner/codes";
import {
  listAllBusinessPartnerEarnings,
  listBusinessPartners,
} from "@/lib/server/business-partners-store";

export type BusinessPartnerCodeIndex = {
  known: Set<string>;
  byRef: Map<string, string>;
};

export async function loadBusinessPartnerCodeIndex(): Promise<BusinessPartnerCodeIndex> {
  const [partners, earnings] = await Promise.all([
    listBusinessPartners(),
    listAllBusinessPartnerEarnings(),
  ]);
  const codeByPartnerId = new Map(
    partners.map((partner) => [partner.id, normalizeReferralCode(partner.referralCode)]),
  );
  const known = new Set([...codeByPartnerId.values()].filter(Boolean));
  const byRef = new Map<string, string>();
  for (const earning of earnings) {
    const code = codeByPartnerId.get(earning.partnerId);
    const ref = String(earning.bookingRef || "").trim();
    if (!code || !ref) continue;
    byRef.set(ref, code);
  }
  return { known, byRef };
}

/** Code to show in admin when the booking came from a partner link, QR, or typed code. */
export function businessPartnerCodeForBooking(
  index: BusinessPartnerCodeIndex,
  input: { promoCode?: string | null; bookingRef?: string | null },
): string {
  const fromPromo = normalizeReferralCode(String(input.promoCode || ""));
  if (fromPromo && index.known.has(fromPromo)) return fromPromo;
  const ref = String(input.bookingRef || "").trim();
  return (ref && index.byRef.get(ref)) || "";
}
