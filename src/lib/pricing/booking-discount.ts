/** Customer discount funded from the site fee (partner on-site share is unchanged). */
export type BookingDiscount = {
  percent: number;
  /** Site discount: card +3% follows the reduced fee. BP promo: card stays on the pre-discount fee. */
  cardOnDiscountedFee: boolean;
};

/** Business-partner promo customer discount. */
export const BP_PROMO_DISCOUNT_PERCENT = 5;

export function clampSiteDiscountPercent(value: unknown, depositPercent: number): number {
  const n = Math.trunc(Number(value) || 0);
  const cap = Math.max(0, Math.trunc(Number(depositPercent) || 0));
  return Math.min(cap, Math.max(0, n));
}

/**
 * Discount a booking was charged with: the stored site discount wins,
 * otherwise a business-partner promo code means the fixed BP discount.
 */
export function resolveBookingDiscount(input: {
  promoCode?: string | null;
  siteDiscountPercent?: number | null;
}): BookingDiscount | null {
  const site = Math.trunc(Number(input.siteDiscountPercent) || 0);
  if (site > 0) return { percent: site, cardOnDiscountedFee: true };
  if (String(input.promoCode || "").trim()) {
    return { percent: BP_PROMO_DISCOUNT_PERCENT, cardOnDiscountedFee: false };
  }
  return null;
}
