"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type {
  BusinessPartnerAdmin,
  BusinessPartnerEarning,
  BusinessPartnerSettings,
} from "@/lib/catalog/business-partners";
import {
  DEFAULT_BUSINESS_PARTNER_COUNTRIES,
  DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS,
} from "@/lib/catalog/business-partners";
import type { BusinessPartnerFinancialStats } from "@/components/admin/business-partners/stats-panel";
import {
  computePeriodMoney,
  filterEarningsForPeriod,
} from "@/lib/business-partner/admin-stats";

export type BusinessPartnerRow = BusinessPartnerAdmin & { referralUrl: string };

type AdminPayload = {
  partners: BusinessPartnerRow[];
  settings: BusinessPartnerSettings;
  stats: BusinessPartnerFinancialStats | null;
  earnings: BusinessPartnerEarning[];
  loading: boolean;
  error: string;
  reload: () => void;
  setPartners: Dispatch<SetStateAction<BusinessPartnerRow[]>>;
  setSettings: Dispatch<SetStateAction<BusinessPartnerSettings>>;
};

export function useBusinessPartnersAdmin(): AdminPayload {
  const [partners, setPartners] = useState<BusinessPartnerRow[]>([]);
  const [settings, setSettings] = useState<BusinessPartnerSettings>({
    countryIso2s: [...DEFAULT_BUSINESS_PARTNER_COUNTRIES],
    notificationEmail: "",
    adminPaypalEmail: "",
    payoutTiers: { ...DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS },
  });
  const [stats, setStats] = useState<BusinessPartnerFinancialStats | null>(null);
  const [earnings, setEarnings] = useState<BusinessPartnerEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-partners", { cache: "no-store" });
      const data = (await res.json()) as {
        partners?: BusinessPartnerRow[];
        settings?: BusinessPartnerSettings;
        stats?: BusinessPartnerFinancialStats;
        earnings?: BusinessPartnerEarning[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Failed to load");
        return;
      }
      setPartners(Array.isArray(data.partners) ? data.partners : []);
      if (data.settings?.countryIso2s) {
        setSettings({
          countryIso2s: data.settings.countryIso2s,
          notificationEmail: String(data.settings.notificationEmail || ""),
          adminPaypalEmail: String(data.settings.adminPaypalEmail || ""),
          payoutTiers: data.settings.payoutTiers || { ...DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS },
        });
      }
      if (data.stats) setStats(data.stats);
      setEarnings(Array.isArray(data.earnings) ? data.earnings : []);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return {
    partners,
    settings,
    stats,
    earnings,
    loading,
    error,
    reload: () => void reload(),
    setPartners,
    setSettings,
  };
}

/**
 * Partner counts from the filtered list; money rates from period earnings
 * (falls back to program rates when there are no bookings in range).
 */
export function deriveDisplayStats(
  partners: BusinessPartnerAdmin[],
  stats: BusinessPartnerFinancialStats | null,
  earnings: BusinessPartnerEarning[] = [],
  fromIso = "",
  toIso = "",
): BusinessPartnerFinancialStats | null {
  const rates = stats?.rates;
  if (!rates) return stats;

  const active = partners.filter((p) => p.status === "ACTIVE").length;
  const pending = partners.filter((p) => p.status === "PENDING").length;
  const rejected = partners.filter(
    (p) => p.status === "REJECTED" || p.status === "DISABLED",
  ).length;

  const partnerIds = new Set(partners.map((p) => p.id));
  const periodEarnings =
    fromIso && toIso
      ? filterEarningsForPeriod(earnings, partnerIds, fromIso, toIso)
      : earnings.filter((e) => partnerIds.has(e.partnerId));
  const money = computePeriodMoney(periodEarnings);

  const nextRates =
    money.bookingCount > 0
      ? {
          avgBookingUsd: money.avgBookingUsd,
          siteCommissionUsd: money.avgSiteCommissionUsd,
          siteShareUsd: money.avgSiteShareUsd,
          partnerShareUsd: money.avgPartnerShareUsd,
          customerDiscountUsd: money.avgCustomerDiscountUsd,
        }
      : rates;

  return {
    totalPartners: partners.length,
    activePartners: active,
    pendingPartners: pending,
    rejectedPartners: rejected,
    rates: nextRates,
    projectedMonthly: {
      siteCommissionUsd:
        money.bookingCount > 0
          ? money.totalSiteCommissionUsd
          : active * nextRates.siteCommissionUsd,
      siteShareUsd:
        money.bookingCount > 0
          ? money.totalSiteShareUsd
          : active *
            (nextRates.siteShareUsd ??
              Math.max(0, nextRates.siteCommissionUsd - nextRates.partnerShareUsd)),
      partnerPayoutUsd:
        money.bookingCount > 0
          ? money.totalPartnerPayoutUsd
          : active * nextRates.partnerShareUsd,
      customerDiscountUsd:
        money.bookingCount > 0
          ? money.totalCustomerDiscountUsd
          : active * nextRates.customerDiscountUsd,
    },
    periodBookingCount: money.bookingCount,
  };
}
