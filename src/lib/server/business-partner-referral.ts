import "server-only";

import { cookies } from "next/headers";
import {
  BP_REF_AT_COOKIE,
  BP_REF_COOKIE,
  BP_REF_COOKIE_MAX_AGE_SEC,
  normalizeReferralCode,
} from "@/lib/business-partner/codes";

/** Read the affiliate referral code from the first-party cookie (if present and < 7 min old). */
export async function readBusinessPartnerReferralCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(BP_REF_COOKIE)?.value;
  if (!raw) return null;

  let code = "";
  try {
    code = normalizeReferralCode(decodeURIComponent(raw));
  } catch {
    code = normalizeReferralCode(raw);
  }
  if (!code) return null;

  const atRaw = jar.get(BP_REF_AT_COOKIE)?.value;
  const at = Number(atRaw || "");
  // Legacy cookies without a timestamp are ignored (must re-scan QR / open link).
  if (!Number.isFinite(at) || at <= 0) return null;
  if (Date.now() - at > BP_REF_COOKIE_MAX_AGE_SEC * 1000) return null;

  return code;
}

/**
 * Prefer the promo code submitted at checkout; otherwise fall back to the QR/link cookie.
 * Pass `allowCookieFallback: false` when the guest explicitly declined a promo code.
 */
export async function resolveBusinessPartnerReferralCode(
  submittedPromo?: string | null,
  opts?: { allowCookieFallback?: boolean },
): Promise<string | null> {
  const fromPromo = normalizeReferralCode(String(submittedPromo || ""));
  if (fromPromo) return fromPromo;
  if (opts?.allowCookieFallback === false) return null;
  return readBusinessPartnerReferralCookie();
}
