export const PORTAL_ID_START = 1000;
export const PARTNER_CODE_PREFIX = "PRT-";

/** Public booking / chat tracking codes: 11R1000, 11R1001, … */
export const BOOKING_REF_PREFIX = "11R";
export const BOOKING_REF_START = 1000;

export function formatPartnerCode(sequentialNumber: number | null | undefined): string | null {
  if (sequentialNumber == null || sequentialNumber < PORTAL_ID_START) return null;
  return `${PARTNER_CODE_PREFIX}${sequentialNumber}`;
}

export function formatCustomerId(customerNumber: number | null | undefined): string | null {
  if (customerNumber == null) return null;
  return String(customerNumber);
}

/** Public booking reference shown to guests, e.g. 11R1000 */
export function formatBookingRef(sequentialNumber: number | null | undefined): string | null {
  if (sequentialNumber == null || !Number.isFinite(sequentialNumber)) return null;
  return `${BOOKING_REF_PREFIX}${Math.trunc(sequentialNumber)}`;
}

/**
 * Accepts 11R1000, 11R-1000, legacy RE-10000 / RE10000, D1000 / #1000, or plain digits.
 */
export function parseBookingRef(raw: string): number | null {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!cleaned) return null;
  const match = cleaned.match(/^(?:11R-?|RE-?|D|#)?(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
