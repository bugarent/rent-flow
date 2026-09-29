"use client";

import {
  BP_REF_QUERY,
  normalizeReferralCode,
  setBusinessPartnerReferralCookieClient,
} from "@/lib/business-partner/codes";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Captures ?bp=CODE from the URL (partner link / QR) into a short-lived cookie
 * + this-tab sessionStorage so checkout can auto-fill for 7 minutes.
 * Auto-fill never runs from a leftover cookie alone — only after ?bp= in this tab.
 */
export function BusinessPartnerReferralCapture() {
  const searchParams = useSearchParams();
  const lastCaptured = useRef("");

  useEffect(() => {
    const raw = searchParams.get(BP_REF_QUERY);
    if (!raw) return;
    const code = normalizeReferralCode(raw);
    if (!code || code === lastCaptured.current) return;
    lastCaptured.current = code;
    setBusinessPartnerReferralCookieClient(code);
  }, [searchParams]);

  return null;
}
