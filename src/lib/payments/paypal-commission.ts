import { DEPOSIT_MAX_PERCENT, DEPOSIT_MIN_PERCENT } from "@/lib/brand";
import { centsToMoney, moneyToCents, roundMoney } from "@/lib/cars/reserve-pricing";

/** Pickup more than this many calendar days away is charged immediately (CAPTURE). */
export const PAYPAL_AUTHORIZE_WITHIN_DAYS = 25;

export type PaypalCheckoutIntent = "CAPTURE" | "AUTHORIZE";

/**
 * Whole calendar days from today until pickup.
 * Dates are compared as YYYY-MM-DD (the date portion of an ISO timestamp).
 * Returns null when the date is missing or not a real calendar day.
 */
export function daysUntilRental(pickupDate: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(pickupDate || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const pickup = new Date(year, month - 1, day);
  if (
    pickup.getFullYear() !== year ||
    pickup.getMonth() !== month - 1 ||
    pickup.getDate() !== day
  ) {
    return null;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((pickup.getTime() - today.getTime()) / 86_400_000);
}

/**
 * More than 25 days before pickup: capture the commission now.
 * 25 days or fewer (including a pickup already in the past): authorize a hold.
 */
export function paypalIntentForPickup(daysUntil: number): PaypalCheckoutIntent {
  return daysUntil > PAYPAL_AUTHORIZE_WITHIN_DAYS ? "CAPTURE" : "AUTHORIZE";
}

/** Admin commission percent, clamped to the site range (0–20). */
export function clampCommissionPercent(value: number): number {
  if (!Number.isFinite(value)) return DEPOSIT_MIN_PERCENT;
  return Math.min(DEPOSIT_MAX_PERCENT, Math.max(DEPOSIT_MIN_PERCENT, Math.trunc(value)));
}

/** Commission in EUR: admin percent of the booking total, in cents so 15% cannot drift. */
export function commissionAmountEur(totalPrice: number, percent: number): number {
  const cents = Math.max(0, moneyToCents(totalPrice));
  const pct = clampCommissionPercent(percent);
  return roundMoney(centsToMoney(Math.round((cents * pct) / 100)));
}
