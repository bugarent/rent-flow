"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBusinessPartnerReferralRemainingMsClient,
  readBusinessPartnerReferralCookieClient,
} from "@/lib/business-partner/codes";
import { BP_CUSTOMER_DISCOUNT_PERCENT } from "@/lib/business-partner/referral-pricing";

function normalizePromo(raw?: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/**
 * Resolves whether an ACTIVE business-partner referral is in play.
 * Discount follows the typed promo field only (auto-fill is handled by checkout
 * from a tab session that was started via ?bp= / QR — never from a bare cookie).
 */
export function useBusinessPartnerReferralDiscount(
  promoCode?: string,
  opts?: { disabled?: boolean },
) {
  const disabled = Boolean(opts?.disabled);
  const typed = disabled ? "" : normalizePromo(promoCode);
  const [validatedCode, setValidatedCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [checking, setChecking] = useState(false);

  // Keep session TTL in sync so auto-filled codes expire after 7 minutes.
  useEffect(() => {
    const remaining = getBusinessPartnerReferralRemainingMsClient();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      // Touch read so expired session is cleared.
      readBusinessPartnerReferralCookieClient();
    }, remaining + 50);
    return () => window.clearTimeout(timer);
  }, [typed]);

  const candidate = typed;

  useEffect(() => {
    if (!candidate) {
      setValidatedCode("");
      setDiscountPercent(0);
      setChecking(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setChecking(true);
      void (async () => {
        try {
          const res = await fetch(
            `/api/business-partners/referral?code=${encodeURIComponent(candidate)}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as {
            active?: boolean;
            code?: string;
            discountPercent?: number;
          };
          if (cancelled) return;
          if (data.active && data.code) {
            setValidatedCode(normalizePromo(data.code));
            setDiscountPercent(
              typeof data.discountPercent === "number"
                ? data.discountPercent
                : BP_CUSTOMER_DISCOUNT_PERCENT,
            );
          } else {
            setValidatedCode("");
            setDiscountPercent(0);
          }
        } catch {
          if (!cancelled) {
            setValidatedCode("");
            setDiscountPercent(0);
          }
        } finally {
          if (!cancelled) setChecking(false);
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [candidate]);

  const active = useMemo(() => {
    if (disabled || !candidate || !validatedCode || discountPercent <= 0) return false;
    return validatedCode === candidate;
  }, [disabled, candidate, validatedCode, discountPercent]);

  return {
    activeCode: active ? validatedCode : "",
    discountPercent: active ? discountPercent : 0,
    active,
    checking: disabled ? false : checking,
    candidate,
  };
}
