import type { BusinessPartnerPayoutTiers } from "@/lib/business-partner/payout-tiers";

export type { BusinessPartnerPayoutTiers };
export { DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS } from "@/lib/business-partner/payout-tiers";

export type BusinessPartnerStatus = "ACTIVE" | "PENDING" | "DISABLED" | "REJECTED";

export type BusinessPartner = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** Messengers registered on this phone (at least one). */
  messengers: string[];
  category: string;
  website: string;
  notes: string;
  /** National personal ID / ID card number (for payouts). */
  personalId: string;
  /** Preferred payout channel. */
  payoutMethod: "BANK" | "PAYPAL";
  /** IBAN (bank transfer). */
  payoutAccount: string;
  /** SWIFT / BIC (bank transfer). */
  payoutSwift: string;
  /** PayPal email / account ID. */
  paypalAccount: string;
  /** Unique referral / QR code (uppercase). */
  referralCode: string;
  /** bcrypt hash for cabinet login (email + password). Never expose to clients. */
  passwordHash: string;
  /**
   * Plaintext cabinet password for admin visibility only.
   * Kept in sync whenever the password is set/changed. Never expose to partner session.
   */
  passwordPlain: string;
  status: BusinessPartnerStatus;
  /** Optional country focus (ISO2), set during moderation. */
  countryIso2: string;
  /** Attributed referral bookings (from cookie/QR attribution when wired). */
  referralBookings: number;
  /** Cumulative partner payout earned (USD). */
  earnedUsd: number;
  /** Amount already transferred / paid out (USD). */
  paidUsd: number;
  createdAt: string;
  updatedAt: string;
};

export type BusinessPartnerTransfer = {
  id: string;
  partnerId: string;
  partnerName: string;
  amountUsd: number;
  createdAt: string;
  note: string;
};

/** One attributed booking that credited the partner balance. */
export type BusinessPartnerEarning = {
  id: string;
  partnerId: string;
  /** Human booking reference shown in admin (e.g. 11R1000). */
  bookingRef: string;
  /** Partner payout (40% of site's 15%). */
  amountUsd: number;
  /** Site program share after customer discount (15% of commissionable). */
  siteEarnedUsd: number;
  /** Portion of this earning already paid out via transfers. */
  paidUsd: number;
  createdAt: string;
  airport: string;
  customerName: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  note: string;
};

export type BusinessPartnerBalanceLine = BusinessPartnerEarning & {
  unpaidUsd: number;
};

export type BusinessPartnerApplyInput = {
  fullName: string;
  email: string;
  phone: string;
  messengers: string[];
  category: string;
  website?: string;
  notes?: string;
  /** Optional desired code; empty → auto-generate. */
  referralCode?: string;
  /** Plain password from apply form; hashed before storage. */
  password: string;
};

export type BusinessPartnerSettings = {
  /** Countries where the business-partner program is enabled. */
  countryIso2s: string[];
  /** Admin address used when composing mail to partners (CC / outbound contact). */
  notificationEmail: string;
  /** Platform PayPal account email used for receiving / sending partner payouts. */
  adminPaypalEmail: string;
  /**
   * Partner share of site’s 15% by monthly booking volume:
   * ≤lowMax → low%, ≤midMax → mid%, else high%.
   */
  payoutTiers: BusinessPartnerPayoutTiers;
};

export const DEFAULT_BUSINESS_PARTNER_COUNTRIES = ["GE", "TR", "AE", "AM", "AZ"] as const;

/** Canonical apply-form categories (English labels). */
export const BUSINESS_PARTNER_CATEGORIES = [
  "Hotel / Guesthouse",
  "Guide / Tour agency",
  "Blogger / Agent",
  "Other",
] as const;

export type BusinessPartnerCategory = (typeof BUSINESS_PARTNER_CATEGORIES)[number];

/** Localized labels that map to the same canonical category. */
const CATEGORY_ALIASES: Record<string, BusinessPartnerCategory> = {
  "hotel / guesthouse": "Hotel / Guesthouse",
  "სასტუმრო / გესთჰაუსი": "Hotel / Guesthouse",
  "guide / tour agency": "Guide / Tour agency",
  "გიდი / ტურისტული სააგენტო": "Guide / Tour agency",
  "blogger / agent": "Blogger / Agent",
  "ბლოგერი / აგენტი": "Blogger / Agent",
  other: "Other",
  სხვა: "Other",
};

/** Normalize any stored/localized category label to the English canonical value. */
export function normalizeBusinessPartnerCategory(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const hit = CATEGORY_ALIASES[trimmed.toLowerCase()] ?? CATEGORY_ALIASES[trimmed];
  if (hit) return hit;
  // Already a canonical English value (case-insensitive)
  const canon = BUSINESS_PARTNER_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  return canon ?? trimmed;
}

/** True when stored category matches the selected filter (any language variant). */
export function businessPartnerCategoryMatches(stored: string, filter: string): boolean {
  const want = normalizeBusinessPartnerCategory(filter);
  if (!want) return true;
  const have = normalizeBusinessPartnerCategory(stored);
  return have.toLowerCase() === want.toLowerCase();
}

/** Partner-facing JSON — never include password hash or plaintext. */
export type BusinessPartnerPublic = Omit<BusinessPartner, "passwordHash" | "passwordPlain">;

export function toPublicBusinessPartner(partner: BusinessPartner): BusinessPartnerPublic {
  const { passwordHash: _hash, passwordPlain: _plain, ...rest } = partner;
  return rest;
}

/** Admin JSON — includes plaintext password for support; never the hash. */
export type BusinessPartnerAdmin = Omit<BusinessPartner, "passwordHash">;

export function toAdminBusinessPartner(partner: BusinessPartner): BusinessPartnerAdmin {
  const { passwordHash: _hash, ...rest } = partner;
  return rest;
}
