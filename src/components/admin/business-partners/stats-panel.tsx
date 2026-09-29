"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import {
  BusinessPartnerStatsFilters,
  type StatsCountryOption,
} from "@/components/admin/business-partners/stats-filters";
import { BusinessPartnerPayoutTiersPanel } from "@/components/admin/business-partners/payout-tiers-panel";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import type { BusinessPartnerAdmin, BusinessPartnerSettings } from "@/lib/catalog/business-partners";
import {
  BUSINESS_PARTNER_CATEGORIES,
  normalizeBusinessPartnerCategory,
} from "@/lib/catalog/business-partners";
import { worldCountryName } from "@/lib/catalog/world-countries";

export type BusinessPartnerFinancialStats = {
  totalPartners: number;
  activePartners: number;
  pendingPartners: number;
  rejectedPartners: number;
  rates: {
    avgBookingUsd: number;
    siteCommissionUsd: number;
    siteShareUsd: number;
    partnerShareUsd: number;
    customerDiscountUsd: number;
  };
  projectedMonthly: {
    siteCommissionUsd: number;
    siteShareUsd: number;
    partnerPayoutUsd: number;
    customerDiscountUsd: number;
  };
  /** Bookings in the selected filter window (0 = program fallback rates). */
  periodBookingCount?: number;
};

function moneyExact(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function siteShareOf(rates: BusinessPartnerFinancialStats["rates"]) {
  return rates.siteShareUsd ?? Math.max(0, rates.siteCommissionUsd - rates.partnerShareUsd);
}

export function BusinessPartnerStatsPanel({
  stats,
  partners,
  from,
  to,
  country,
  countries,
  category,
  categories,
  q = "",
  settings,
  onSettingsUpdated,
}: {
  stats: BusinessPartnerFinancialStats | null;
  partners: BusinessPartnerAdmin[];
  hideTitle?: boolean;
  from: string;
  to: string;
  country: string;
  countries: StatsCountryOption[];
  category: string;
  categories: string[];
  q?: string;
  settings?: BusinessPartnerSettings;
  onSettingsUpdated?: (next: BusinessPartnerSettings) => void;
}) {
  const L = useBpLabels();
  const topEarners = useMemo(() => {
    return [...partners]
      .filter((p) => p.status === "ACTIVE" || p.status === "DISABLED")
      .sort((a, b) => {
        const ae = Number(a.earnedUsd) || 0;
        const be = Number(b.earnedUsd) || 0;
        if (be !== ae) return be - ae;
        const ab = Number(a.referralBookings) || 0;
        const bb = Number(b.referralBookings) || 0;
        if (bb !== ab) return bb - ab;
        return a.fullName.localeCompare(b.fullName);
      })
      .slice(0, 20);
  }, [partners]);

  const categoryIncome = useMemo(() => {
    const map = new Map<
      string,
      { category: string; partners: number; bookings: number; earnedUsd: number }
    >();

    for (const label of BUSINESS_PARTNER_CATEGORIES) {
      map.set(label, { category: label, partners: 0, bookings: 0, earnedUsd: 0 });
    }

    for (const p of partners) {
      if (p.status !== "ACTIVE" && p.status !== "DISABLED") continue;
      const bookings = Number(p.referralBookings) || 0;
      const earnedUsd = Number(p.earnedUsd) || 0;
      const key = normalizeBusinessPartnerCategory(p.category) || "Other";
      const row = map.get(key) ?? {
        category: key,
        partners: 0,
        bookings: 0,
        earnedUsd: 0,
      };
      row.partners += 1;
      row.bookings += bookings;
      row.earnedUsd += earnedUsd;
      map.set(key, row);
    }

    return [...map.values()].sort((a, b) => {
      if (b.earnedUsd !== a.earnedUsd) return b.earnedUsd - a.earnedUsd;
      if (b.bookings !== a.bookings) return b.bookings - a.bookings;
      return a.category.localeCompare(b.category);
    });
  }, [partners]);

  const categoryTotalEarned = categoryIncome.reduce((acc, r) => acc + r.earnedUsd, 0);

  if (!stats) {
    return <p className="text-sm text-slate-500">{L.loading}</p>;
  }

  const { rates } = stats;
  const siteShareUsd = siteShareOf(rates);
  const bookingCount = Number(stats.periodBookingCount) || 0;
  const periodHint =
    bookingCount > 0
      ? `${bookingCount} ${L.bookingsInFilter}`
      : L.programRate;

  const filterHint = [
    country ? worldCountryName(country) || country : null,
    category || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <BusinessPartnerStatsFilters
        from={from}
        to={to}
        country={country}
        countries={countries}
        category={category}
        categories={categories}
        q={q}
        tab="stats"
      />

      <div className="mb-3 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">{L.avgBooking}</h3>
          <p className="mt-2 text-3xl font-extrabold">{moneyExact(rates.avgBookingUsd)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {from} → {to}
            {country ? ` · ${country}` : ""}
            {category ? ` · ${category}` : ""}
            {` · ${periodHint}`}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">{L.siteShare}</h3>
          <p className="mt-2 text-3xl font-extrabold text-sky-700">{moneyExact(siteShareUsd)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {L.perBooking} · {L.siteCommission} {moneyExact(rates.siteCommissionUsd)}
            {bookingCount > 0 ? ` · ${L.totalWord} ${moneyExact(stats.projectedMonthly.siteShareUsd)}` : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">{L.partnerShare}</h3>
          <p className="mt-2 text-3xl font-extrabold text-green-600">
            {moneyExact(rates.partnerShareUsd)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {L.perBooking}
            {bookingCount > 0
              ? ` · ${L.totalWord} ${moneyExact(stats.projectedMonthly.partnerPayoutUsd)}`
              : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">{L.customerDiscount}</h3>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            {moneyExact(rates.customerDiscountUsd)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {L.perBooking}
            {bookingCount > 0
              ? ` · ${L.totalWord} ${moneyExact(stats.projectedMonthly.customerDiscountUsd)}`
              : ""}
          </p>
        </div>
      </div>

      {settings ? (
        <div className="mb-3">
          <BusinessPartnerPayoutTiersPanel
            settings={settings}
            onSettingsUpdated={onSettingsUpdated}
          />
        </div>
      ) : null}

      <CollapsibleSection
        title={L.categoryIncome}
        subtitle={
          filterHint
            ? `${L.byFilter} (${filterHint}) — ${L.categoryTotalFiltered} ${moneyExact(categoryTotalEarned)}.`
            : `${L.categoryTotalFiltered} ${moneyExact(categoryTotalEarned)}.`
        }
      >
        <ResponsiveDataList
          desktop={
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-100">
                  <th className="p-4">{L.category}</th>
                  <th className="p-4">{L.partners}</th>
                  <th className="p-4">{L.bookings}</th>
                  <th className="p-4">{L.earned}</th>
                  <th className="p-4">{L.share}</th>
                </tr>
              </thead>
              <tbody>
                {categoryIncome.every((r) => r.partners === 0) ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {L.noCategoryData}
                    </td>
                  </tr>
                ) : (
                  categoryIncome.map((row) => {
                    const share =
                      categoryTotalEarned > 0
                        ? Math.round((row.earnedUsd / categoryTotalEarned) * 100)
                        : 0;
                    return (
                      <tr key={row.category} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-semibold text-[#0b1f4b]">{row.category}</td>
                        <td className="p-4">{row.partners}</td>
                        <td className="p-4">{row.bookings}</td>
                        <td className="p-4 font-semibold text-green-600">
                          {moneyExact(row.earnedUsd)}
                        </td>
                        <td className="p-4 font-semibold text-sky-700">{share}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          }
          mobile={
            categoryIncome.every((r) => r.partners === 0) ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                {L.noCategoryData}
              </p>
            ) : (
              categoryIncome.map((row) => {
                const share =
                  categoryTotalEarned > 0
                    ? Math.round((row.earnedUsd / categoryTotalEarned) * 100)
                    : 0;
                return (
                  <MobileDataCard key={row.category}>
                    <MobileDataRow label={L.category}>{row.category}</MobileDataRow>
                    <MobileDataRow label={L.partners}>{row.partners}</MobileDataRow>
                    <MobileDataRow label={L.bookings}>{row.bookings}</MobileDataRow>
                    <MobileDataRow label={L.earned}>
                      <span className="text-green-600">{moneyExact(row.earnedUsd)}</span>
                    </MobileDataRow>
                    <MobileDataRow label={L.share}>
                      <span className="text-sky-700">{share}%</span>
                    </MobileDataRow>
                  </MobileDataCard>
                );
              })
            )
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={L.topEarners}
        subtitle={
          filterHint
            ? `${L.byFilter} (${filterHint}) — ${L.topEarnersBody}`
            : L.topEarnersBody
        }
      >
        <ResponsiveDataList
          desktop={
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-100">
                  <th className="p-4">#</th>
                  <th className="p-4">{L.partner}</th>
                  <th className="p-4">{L.category}</th>
                  <th className="p-4">{L.country}</th>
                  <th className="p-4">{L.code}</th>
                  <th className="p-4">{L.bookings}</th>
                  <th className="p-4">{L.earned}</th>
                </tr>
              </thead>
              <tbody>
                {topEarners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {L.noPartnersFilter}
                    </td>
                  </tr>
                ) : (
                  topEarners.map((p, idx) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-semibold text-[#0b1f4b]">{p.fullName}</td>
                      <td className="p-4 text-slate-700">{p.category || "—"}</td>
                      <td className="p-4 text-slate-700">
                        {p.countryIso2 ? worldCountryName(p.countryIso2) : "—"}
                      </td>
                      <td className="p-4 font-mono font-bold text-[#0b1f4b]">{p.referralCode}</td>
                      <td className="p-4">{Number(p.referralBookings) || 0}</td>
                      <td className="p-4 font-semibold text-green-600">
                        {moneyExact(Number(p.earnedUsd) || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          }
          mobile={
            topEarners.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                {L.noPartnersFilter}
              </p>
            ) : (
              topEarners.map((p, idx) => (
                <MobileDataCard key={p.id}>
                  <MobileDataRow label="#">
                    <span className="text-slate-500">{idx + 1}</span>
                  </MobileDataRow>
                  <MobileDataRow label={L.partner}>{p.fullName}</MobileDataRow>
                  <MobileDataRow label={L.category}>{p.category || "—"}</MobileDataRow>
                  <MobileDataRow label={L.country}>
                    {p.countryIso2 ? worldCountryName(p.countryIso2) : "—"}
                  </MobileDataRow>
                  <MobileDataRow label={L.code}>
                    <span className="font-mono">{p.referralCode}</span>
                  </MobileDataRow>
                  <MobileDataRow label={L.bookings}>{Number(p.referralBookings) || 0}</MobileDataRow>
                  <MobileDataRow label={L.earned}>
                    <span className="text-green-600">
                      {moneyExact(Number(p.earnedUsd) || 0)}
                    </span>
                  </MobileDataRow>
                </MobileDataCard>
              ))
            )
          }
        />
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-8 overflow-hidden rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span
          className={`mt-1 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open ? <div className="p-3 md:p-0">{children}</div> : null}
    </section>
  );
}
