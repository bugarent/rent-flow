"use client";

import { fetchJsonCached, prefetchJson } from "@/lib/client/json-cache";

export type CheckoutLegalPages = { terms?: { body?: string; fileUrl?: string } };
export type CheckoutDepositSettings = { depositPercent?: number; siteDiscountPercent?: number };

const LEGAL_URL = "/api/legal-pages";
const DEPOSIT_URL = "/api/platform/deposit";
/** Short: admin edits to terms or deposit must reach new checkouts quickly. */
const LEGAL_TTL_MS = 60_000;
const DEPOSIT_TTL_MS = 30_000;

export const loadCheckoutLegalPages = () => fetchJsonCached<CheckoutLegalPages>(LEGAL_URL, LEGAL_TTL_MS);
export const loadCheckoutDeposit = () => fetchJsonCached<CheckoutDepositSettings>(DEPOSIT_URL, DEPOSIT_TTL_MS);

/** Called on car-card intent so the checkout opens with terms and deposit ready. */
export function warmCheckoutData() {
  prefetchJson(LEGAL_URL, LEGAL_TTL_MS);
  prefetchJson(DEPOSIT_URL, DEPOSIT_TTL_MS);
}
