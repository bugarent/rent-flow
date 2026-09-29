/** Partner payout share of the site’s 15%, by monthly attributed booking volume. */

export type BusinessPartnerPayoutTiers = {
  /** Inclusive max monthly bookings for the low tier (default 5 → 30%). */
  lowMaxBookings: number;
  lowPercent: number;
  /** Inclusive max monthly bookings for the mid tier (default 25 → 40%). */
  midMaxBookings: number;
  midPercent: number;
  /** High tier applies above midMaxBookings (default 50%). */
  highPercent: number;
};

export const DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS: BusinessPartnerPayoutTiers = {
  lowMaxBookings: 5,
  lowPercent: 30,
  midMaxBookings: 25,
  midPercent: 40,
  highPercent: 50,
};

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function clampPercent(n: unknown, fallback: number) {
  return clampInt(n, 1, 100, fallback);
}

export function normalizeBusinessPartnerPayoutTiers(
  raw: Partial<BusinessPartnerPayoutTiers> | null | undefined,
): BusinessPartnerPayoutTiers {
  const d = DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS;
  let lowMax = clampInt(raw?.lowMaxBookings, 1, 10_000, d.lowMaxBookings);
  let midMax = clampInt(raw?.midMaxBookings, 1, 10_000, d.midMaxBookings);
  if (midMax <= lowMax) midMax = lowMax + 1;
  return {
    lowMaxBookings: lowMax,
    lowPercent: clampPercent(raw?.lowPercent, d.lowPercent),
    midMaxBookings: midMax,
    midPercent: clampPercent(raw?.midPercent, d.midPercent),
    highPercent: clampPercent(raw?.highPercent, d.highPercent),
  };
}

/** Pick partner-of-site % from this partner’s booking count in the current month. */
export function resolvePartnerOfSitePercent(
  monthlyBookingCount: number,
  tiers?: Partial<BusinessPartnerPayoutTiers> | null,
): number {
  const t = normalizeBusinessPartnerPayoutTiers(tiers);
  const n = Math.max(0, Math.floor(Number(monthlyBookingCount) || 0));
  if (n <= 0) return t.lowPercent;
  if (n <= t.lowMaxBookings) return t.lowPercent;
  if (n <= t.midMaxBookings) return t.midPercent;
  return t.highPercent;
}

/** Calendar month key in local time (1st → last day of month). */
export function monthKeyLocal(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** @deprecated use monthKeyLocal — kept for older callers */
export function monthKeyUtc(d = new Date()): string {
  return monthKeyLocal(d);
}

export function isIsoInMonthLocal(iso: string, key: string): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return monthKeyLocal(new Date(t)) === key;
}

/** @deprecated use isIsoInMonthLocal */
export function isIsoInMonthUtc(iso: string, key: string): boolean {
  return isIsoInMonthLocal(iso, key);
}

/** Partner payout USD from stored site program share + tier %. */
export function partnerAmountFromSiteEarned(
  siteEarnedUsd: number,
  partnerOfSitePercent: number,
): number {
  const site = Math.max(0, Number(siteEarnedUsd) || 0);
  const pct = Math.min(100, Math.max(0, Number(partnerOfSitePercent) || 0));
  return Math.round(site * (pct / 100) * 100) / 100;
}

