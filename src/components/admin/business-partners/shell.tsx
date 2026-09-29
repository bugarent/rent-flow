"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPillTabs } from "@/components/admin/admin-pill-tabs";
import { BusinessPartnerModerationPanel } from "@/components/admin/business-partners/moderation-panel";
import { BusinessPartnerInvoicePanel } from "@/components/admin/business-partners/invoice-panel";
import { BusinessPartnerHistoryPanel } from "@/components/admin/business-partners/history-panel";
import { BusinessPartnerStatsPanel } from "@/components/admin/business-partners/stats-panel";
import { BusinessPartnersListPanel } from "@/components/admin/business-partners/list-panel";
import {
  deriveDisplayStats,
  useBusinessPartnersAdmin,
} from "@/components/admin/business-partners/use-admin-data";
import {
  defaultStatsDateRange,
  filterPartnersForStats,
  BusinessPartnerStatsFilters,
} from "@/components/admin/business-partners/stats-filters";
import {
  filterEarningsForPeriod,
  partnersWithPeriodEarnings,
} from "@/lib/business-partner/admin-stats";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import type { BusinessPartner } from "@/lib/catalog/business-partners";
import { BUSINESS_PARTNER_CATEGORIES } from "@/lib/catalog/business-partners";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { ADMIN_BASE } from "@/lib/routes";

export type BusinessPartnersTab = "moderation" | "countries" | "stats" | "list" | "history";

const BASE = `${ADMIN_BASE}/business-partners`;

export function parseBusinessPartnersTab(raw?: string | null): BusinessPartnersTab {
  if (raw === "countries" || raw === "country" || raw === "invoice" || raw === "invoices") {
    return "countries";
  }
  if (raw === "stats" || raw === "statistics") return "stats";
  if (raw === "moderation") return "moderation";
  if (raw === "history" || raw === "transfers") return "history";
  if (raw === "list" || raw === "partners") return "list";
  return "list";
}

export function BusinessPartnersShell() {
  const { dictionary } = useAdminLocale();
  const t = dictionary.pages.businessPartners;
  const searchParams = useSearchParams();
  const tab = parseBusinessPartnersTab(searchParams.get("tab"));

  const {
    partners,
    settings,
    stats,
    earnings,
    loading,
    error,
    reload,
    setPartners,
    setSettings,
  } = useBusinessPartnersAdmin();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const res = await fetch("/api/admin/business-partners/unread", { cache: "no-store" });
        const data = (await res.json()) as { unreadTotal?: number };
        if (!cancelled && res.ok) setUnreadCount(Number(data.unreadTotal) || 0);
      } catch {
        /* ignore */
      }
    };
    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tab, partners]);

  /** Opening moderation marks applications as seen — nav/pill stop blinking. */
  useEffect(() => {
    if (tab !== "moderation") return;
    let cancelled = false;
    void (async () => {
      // Brief delay so the yellow badge is visible before clearing.
      await new Promise((r) => window.setTimeout(r, 1200));
      if (cancelled) return;
      try {
        const res = await fetch("/api/admin/business-partners/unread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAll: true }),
        });
        const data = (await res.json()) as { unreadTotal?: number };
        if (!cancelled && res.ok) setUnreadCount(Number(data.unreadTotal) || 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  /** Fresh earnings when opening History (after transfers on Invoice). */
  useEffect(() => {
    if (tab !== "history") return;
    reload();
  }, [tab]);

  const defaults = defaultStatsDateRange();
  const from = searchParams.get("from") || defaults.from;
  const to = searchParams.get("to") || defaults.to;
  const country = (searchParams.get("country") || "").toUpperCase();
  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";

  const filteredPartners = useMemo(
    () => filterPartnersForStats(partners, from, to, country, category, q),
    [partners, from, to, country, category, q],
  );

  /** Partners for money rollups: country / category / search only (dates apply to earnings). */
  const statsPartners = useMemo(
    () => filterPartnersForStats(partners, "", "", country, category, q),
    [partners, country, category, q],
  );

  const periodEarnings = useMemo(() => {
    const ids = new Set(statsPartners.map((p) => p.id));
    return filterEarningsForPeriod(earnings, ids, from, to);
  }, [earnings, statsPartners, from, to]);

  const statsPartnersForTables = useMemo(
    () => partnersWithPeriodEarnings(statsPartners, periodEarnings),
    [statsPartners, periodEarnings],
  );

  const displayStats = deriveDisplayStats(
    statsPartners,
    stats,
    earnings,
    from,
    to,
  );

  /** Invoice shares country / category / search with stats (dates apply to earnings there). */
  const invoicePartners = statsPartners;

  const countryOptions = useMemo(() => {
    const iso2s = new Set<string>([
      ...settings.countryIso2s,
      ...partners.map((p) => p.countryIso2).filter(Boolean),
    ]);
    return [...iso2s]
      .filter(Boolean)
      .sort()
      .map((iso2) => ({ iso2, label: worldCountryName(iso2) }));
  }, [settings.countryIso2s, partners]);

  const categoryOptions = useMemo(() => [...BUSINESS_PARTNER_CATEGORIES], []);

  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `&${s}` : "";
  }, [from, to, country, category, q]);

  const tabs = useMemo(
    () => [
      {
        href: `${BASE}?tab=list${filterQs}`,
        label: t.tabList,
        active: tab === "list",
      },
      {
        href: `${BASE}?tab=stats${filterQs}`,
        label: t.tabStats,
        active: tab === "stats",
      },
      {
        href: `${BASE}?tab=invoice${filterQs}`,
        label: t.tabCountries,
        active: tab === "countries",
      },
      {
        href: `${BASE}?tab=history${filterQs}`,
        label: t.tabHistory,
        active: tab === "history",
      },
      {
        href: `${BASE}?tab=moderation${filterQs}`,
        label: t.tabModeration,
        active: tab === "moderation",
        badge: unreadCount,
      },
    ],
    [t.tabModeration, t.tabCountries, t.tabStats, t.tabList, t.tabHistory, tab, unreadCount, filterQs],
  );

  return (
    <div className="space-y-4">
      <AdminPillTabs tabs={tabs} />

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

      {tab === "moderation" ? (
        <BusinessPartnerModerationPanel
          hideTitle
          partners={partners}
          enabledCountries={settings.countryIso2s}
          onUpdated={(partner: BusinessPartner) => {
            setPartners((prev) =>
              prev.map((p) => (p.id === partner.id ? { ...p, ...partner } : p)),
            );
          }}
        />
      ) : null}

      {tab === "countries" ? (
        <div className="space-y-4">
          <BusinessPartnerStatsFilters
            tab="countries"
            from={from}
            to={to}
            country={country}
            countries={countryOptions}
            category={category}
            categories={categoryOptions}
            q={q}
          />
          <BusinessPartnerInvoicePanel
            partners={invoicePartners}
            onPartnerUpdated={(partner) => {
              setPartners((prev) =>
                prev.map((p) => (p.id === partner.id ? { ...p, ...partner } : p)),
              );
            }}
            onPartnerDeleted={(partnerId) => {
              setPartners((prev) => prev.filter((p) => p.id !== partnerId));
            }}
          />
        </div>
      ) : null}

      {tab === "history" ? (
        <BusinessPartnerHistoryPanel earnings={earnings} partners={partners} />
      ) : null}

      {tab === "stats" ? (
        <BusinessPartnerStatsPanel
          hideTitle
          stats={displayStats}
          partners={statsPartnersForTables}
          from={from}
          to={to}
          country={country}
          countries={countryOptions}
          category={category}
          categories={categoryOptions}
          q={q}
          settings={settings}
          onSettingsUpdated={setSettings}
        />
      ) : null}

      {tab === "list" ? (
        <div className="space-y-4">
          <BusinessPartnerStatsFilters
            tab="list"
            from={from}
            to={to}
            country={country}
            countries={countryOptions}
            category={category}
            categories={categoryOptions}
            q={q}
          />
          <BusinessPartnersListPanel
            partners={filteredPartners}
            q={q}
            loading={loading}
            onReload={reload}
            settings={settings}
            onSettingsUpdated={setSettings}
            onPartnerUpdated={(partner) => {
              setPartners((prev) =>
                prev.map((p) => (p.id === partner.id ? { ...p, ...partner } : p)),
              );
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
