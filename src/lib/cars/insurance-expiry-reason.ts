/** Stored on the listing when insurance expiry sends it back to admin moderation. */
export const INSURANCE_EXPIRY_REASON = "Insurance expired — awaiting re-moderation";

export function isInsuranceExpiryReason(reason: string | null | undefined): boolean {
  const text = String(reason || "").trim().toLowerCase();
  if (!text) return false;
  return text.includes("insurance expired") || text.includes("დაზღვევ");
}

export function insuranceExpiryReasonLabel(locale: string): string {
  if (locale === "ka") return "დაზღვევას გაუვიდა ვადა";
  if (locale === "ru") return "Срок страховки истёк";
  return "Insurance expired";
}

/** True when the expiry day (YYYY-MM-DD) is today or earlier in local time. */
export function isInsuranceDateExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  const day = String(expiresAt || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return day <= today;
}
