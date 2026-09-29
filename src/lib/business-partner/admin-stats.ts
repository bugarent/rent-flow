import type { BusinessPartnerEarning } from "@/lib/catalog/business-partners";
import {
  BP_CUSTOMER_DISCOUNT_PERCENT,
  BP_SITE_AFTER_DISCOUNT_PERCENT,
} from "@/lib/business-partner/referral-pricing";

export type BusinessPartnerPeriodMoney = {
  bookingCount: number;
  /** Average commissionable booking (pre-discount) in the period. */
  avgBookingUsd: number;
  /** Average site program share (15%) per booking. */
  avgSiteCommissionUsd: number;
  /** Average site kept (60% of the 15%) per booking. */
  avgSiteShareUsd: number;
  /** Average partner payout per booking. */
  avgPartnerShareUsd: number;
  /** Average customer discount per booking. */
  avgCustomerDiscountUsd: number;
  totalSiteCommissionUsd: number;
  totalSiteShareUsd: number;
  totalPartnerPayoutUsd: number;
  totalCustomerDiscountUsd: number;
};

export type PartnerPeriodRollup = {
  partnerId: string;
  bookings: number;
  earnedUsd: number;
  siteEarnedUsd: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Infer pre-discount commissionable from stored site share (15%). */
export function commissionableFromSiteEarned(siteEarnedUsd: number): number {
  const site = Math.max(0, Number(siteEarnedUsd) || 0);
  if (BP_SITE_AFTER_DISCOUNT_PERCENT <= 0) return 0;
  return round2((site * 100) / BP_SITE_AFTER_DISCOUNT_PERCENT);
}

export function customerDiscountFromSiteEarned(siteEarnedUsd: number): number {
  const site = Math.max(0, Number(siteEarnedUsd) || 0);
  if (BP_SITE_AFTER_DISCOUNT_PERCENT <= 0) return 0;
  return round2((site * BP_CUSTOMER_DISCOUNT_PERCENT) / BP_SITE_AFTER_DISCOUNT_PERCENT);
}

export function filterEarningsForPeriod(
  earnings: BusinessPartnerEarning[],
  partnerIds: Set<string>,
  fromIso: string,
  toIso: string,
): BusinessPartnerEarning[] {
  const fromMs = Date.parse(`${fromIso}T00:00:00.000Z`);
  const toMs = Date.parse(`${toIso}T23:59:59.999Z`);
  return earnings.filter((e) => {
    if (!partnerIds.has(e.partnerId)) return false;
    const t = Date.parse(e.createdAt);
    if (!Number.isFinite(t)) return false;
    if (Number.isFinite(fromMs) && t < fromMs) return false;
    if (Number.isFinite(toMs) && t > toMs) return false;
    return true;
  });
}

export function rollupPartnersFromEarnings(
  earnings: BusinessPartnerEarning[],
): Map<string, PartnerPeriodRollup> {
  const map = new Map<string, PartnerPeriodRollup>();
  for (const e of earnings) {
    const row = map.get(e.partnerId) ?? {
      partnerId: e.partnerId,
      bookings: 0,
      earnedUsd: 0,
      siteEarnedUsd: 0,
    };
    row.bookings += 1;
    row.earnedUsd = round2(row.earnedUsd + (Number(e.amountUsd) || 0));
    row.siteEarnedUsd = round2(row.siteEarnedUsd + (Number(e.siteEarnedUsd) || 0));
    map.set(e.partnerId, row);
  }
  return map;
}

/** Attach period booking/earn totals onto partners (lifetime fields overwritten for display). */
export function partnersWithPeriodEarnings<T extends { id: string }>(
  partners: T[],
  earnings: BusinessPartnerEarning[],
): T[] {
  const rollup = rollupPartnersFromEarnings(earnings);
  return partners.map((p) => {
    const row = rollup.get(p.id);
    if (!row) {
      return { ...p, referralBookings: 0, earnedUsd: 0 };
    }
    return {
      ...p,
      referralBookings: row.bookings,
      earnedUsd: row.earnedUsd,
    };
  });
}

export function computePeriodMoney(
  earnings: BusinessPartnerEarning[],
): BusinessPartnerPeriodMoney {
  const bookingCount = earnings.length;
  if (bookingCount === 0) {
    return {
      bookingCount: 0,
      avgBookingUsd: 0,
      avgSiteCommissionUsd: 0,
      avgSiteShareUsd: 0,
      avgPartnerShareUsd: 0,
      avgCustomerDiscountUsd: 0,
      totalSiteCommissionUsd: 0,
      totalSiteShareUsd: 0,
      totalPartnerPayoutUsd: 0,
      totalCustomerDiscountUsd: 0,
    };
  }

  let totalCommissionable = 0;
  let totalSiteCommission = 0;
  let totalPartner = 0;
  let totalDiscount = 0;

  for (const e of earnings) {
    const site = Math.max(0, Number(e.siteEarnedUsd) || 0);
    const partner = Math.max(0, Number(e.amountUsd) || 0);
    totalCommissionable += commissionableFromSiteEarned(site);
    totalSiteCommission += site;
    totalPartner += partner;
    totalDiscount += customerDiscountFromSiteEarned(site);
  }

  const totalSiteShare = round2(totalSiteCommission - totalPartner);
  const n = bookingCount;

  return {
    bookingCount: n,
    avgBookingUsd: round2(totalCommissionable / n),
    avgSiteCommissionUsd: round2(totalSiteCommission / n),
    avgSiteShareUsd: round2(totalSiteShare / n),
    avgPartnerShareUsd: round2(totalPartner / n),
    avgCustomerDiscountUsd: round2(totalDiscount / n),
    totalSiteCommissionUsd: round2(totalSiteCommission),
    totalSiteShareUsd: totalSiteShare,
    totalPartnerPayoutUsd: round2(totalPartner),
    totalCustomerDiscountUsd: round2(totalDiscount),
  };
}
