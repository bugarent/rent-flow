"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminPillTabs } from "@/components/admin/admin-pill-tabs";
import { BusinessPartnerCabinetProfile,
  type CabinetProfilePartner,
} from "@/components/business/business-partner-cabinet-profile";
import { BusinessPartnerIntegrationTools } from "@/components/business/business-partner-integration-tools";
import { CabinetDateField } from "@/components/business/cabinet-date-field";
import { useBusinessPartnerPreferences } from "@/components/providers/business-partner-preferences-context";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import { BUSINESS_PARTNER_BASE, BUSINESS_PARTNER_LOGIN } from "@/lib/routes";
import { convertCurrency, formatMoneyAmount } from "@/lib/utils";

type CabinetEarning = {
  id: string;
  bookingRef: string;
  amountUsd: number;
  siteEarnedUsd: number;
  paidUsd: number;
  unpaidUsd: number;
  airport: string;
  customerName: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  createdAt: string;
};

type CabinetTab = "cabinet" | "bookings" | "tools";

function parseCabinetTab(raw?: string | null): CabinetTab {
  if (raw === "bookings" || raw === "booking") return "bookings";
  if (raw === "tools" || raw === "tool") return "tools";
  return "cabinet";
}

function formatBookingDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

export function BusinessPartnerCabinet({
  labels,
}: {
  labels: {
    title: string;
    loading: string;
    logout: string;
    tabCabinet: string;
    tabBookings: string;
    tabTools: string;
    mainInfo: string;
    fieldFullName: string;
    fieldFirstName: string;
    fieldLastName: string;
    fieldPersonalId: string;
    fieldPayoutMethod: string;
    fieldPayoutMethodBank: string;
    fieldPayoutMethodPaypal: string;
    fieldPayoutAccount: string;
    fieldPayoutAccountHint: string;
    fieldPayoutSwift: string;
    fieldPayoutSwiftHint: string;
    fieldPaypalAccount: string;
    fieldPaypalAccountHint: string;
    payoutValid: string;
    payoutInvalidIban: string;
    payoutInvalidSwift: string;
    payoutInvalidPaypal: string;
    fieldEmail: string;
    fieldPhone: string;
    fieldCategory: string;
    fieldCountry: string;
    fieldWebsite: string;
    fieldStatus: string;
    statusActive: string;
    statusInactive: string;
    fieldMessengers: string;
    login: string;
    oldPassword: string;
    newPassword: string;
    passwordHint: string;
    passwordWrong: string;
    passwordUpdated: string;
    save: string;
    saving: string;
    saved: string;
    nameRequired: string;
    idsRequired: string;
    earned: string;
    paid: string;
    unpaid: string;
    bookings: string;
    code: string;
    earningsTitle: string;
    earningsEmpty: string;
    colBooking: string;
    colCustomer: string;
    colEmail: string;
    colPartner: string;
    colStatus: string;
    colBookingDate: string;
    statusTransferred: string;
    statusPendingPayout: string;
    dateFrom: string;
    dateTo: string;
    search: string;
    clearDates: string;
    back: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseCabinetTab(searchParams.get("tab"));
  const { currency, fxRates } = useBusinessPartnerPreferences();

  const money = (amountUsd: number) =>
    formatMoneyAmount(convertCurrency(amountUsd, "USD", currency, fxRates), currency);
  const [partner, setPartner] = useState<CabinetProfilePartner | null>(null);
  const [referralUrl, setReferralUrl] = useState("");
  const [earnings, setEarnings] = useState<CabinetEarning[]>([]);
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/business-partners/session", { cache: "no-store" });
        if (res.status === 401) {
          router.replace(BUSINESS_PARTNER_LOGIN);
          return;
        }
        const data = (await res.json()) as {
          partner?: CabinetProfilePartner;
          referralUrl?: string;
          earnings?: CabinetEarning[];
          error?: string;
        };
        if (!res.ok || !data.partner) {
          if (!cancelled) setError(data.error || "Failed to load");
          return;
        }
        if (cancelled) return;
        setPartner({
          ...data.partner,
          messengers: Array.isArray(data.partner.messengers) ? data.partner.messengers : [],
          website: data.partner.website || "",
          notes: data.partner.notes || "",
          personalId: data.partner.personalId || "",
          payoutMethod: data.partner.payoutMethod === "PAYPAL" ? "PAYPAL" : "BANK",
          payoutAccount: data.partner.payoutAccount || "",
          payoutSwift: data.partner.payoutSwift || "",
          paypalAccount: data.partner.paypalAccount || "",
        });
        setReferralUrl(data.referralUrl || "");
        setEarnings(Array.isArray(data.earnings) ? data.earnings : []);
      } catch {
        if (!cancelled) setError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = async () => {
    await fetch("/api/business-partners/session", { method: "DELETE" });
    router.push(BUSINESS_PARTNER_LOGIN);
    router.refresh();
  };

  const tabs = useMemo(
    () => [
      {
        href: `${BUSINESS_PARTNER_BASE}?tab=bookings`,
        label: labels.tabBookings,
        active: tab === "bookings",
      },
      {
        href: `${BUSINESS_PARTNER_BASE}?tab=cabinet`,
        label: labels.tabCabinet,
        active: tab === "cabinet",
      },
      {
        href: `${BUSINESS_PARTNER_BASE}?tab=tools`,
        label: labels.tabTools,
        active: tab === "tools",
      },
    ],
    [labels.tabCabinet, labels.tabBookings, labels.tabTools, tab],
  );

  const filteredEarnings = useMemo(() => {
    const fromMs = dateFrom ? Date.parse(`${dateFrom}T00:00:00.000Z`) : NaN;
    const toMs = dateTo ? Date.parse(`${dateTo}T23:59:59.999Z`) : NaN;
    return earnings.filter((row) => {
      const created = Date.parse(row.createdAt);
      if (!Number.isFinite(created)) return !dateFrom && !dateTo;
      if (Number.isFinite(fromMs) && created < fromMs) return false;
      if (Number.isFinite(toMs) && created > toMs) return false;
      return true;
    });
  }, [earnings, dateFrom, dateTo]);

  if (loading) {
    return <p className="text-sm text-slate-500">{labels.loading}</p>;
  }

  if (error || !partner) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-rose-600">{error || "—"}</p>
        <Link href={BUSINESS_PARTNER_LOGIN} className="text-sm font-bold text-[#1d6fe8] hover:underline">
          {labels.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-[#0b1f4b] sm:text-2xl">{labels.title}</h1>
          <p className="mt-1 break-words text-sm text-slate-600">
            {partner.fullName} · {partner.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:min-h-0"
          >
            {labels.logout}
          </button>
        </div>
      </div>

      <AdminPillTabs tabs={tabs} />

      {tab === "cabinet" ? (
        <BusinessPartnerCabinetProfile
          partner={partner}
          referralUrl={referralUrl}
          labels={{
            mainInfo: labels.mainInfo,
            firstName: labels.fieldFirstName,
            lastName: labels.fieldLastName,
            personalId: labels.fieldPersonalId,
            payoutMethod: labels.fieldPayoutMethod,
            payoutMethodBank: labels.fieldPayoutMethodBank,
            payoutMethodPaypal: labels.fieldPayoutMethodPaypal,
            payoutAccount: labels.fieldPayoutAccount,
            payoutAccountHint: labels.fieldPayoutAccountHint,
            payoutSwift: labels.fieldPayoutSwift,
            payoutSwiftHint: labels.fieldPayoutSwiftHint,
            paypalAccount: labels.fieldPaypalAccount,
            paypalAccountHint: labels.fieldPaypalAccountHint,
            payoutValid: labels.payoutValid,
            payoutInvalidIban: labels.payoutInvalidIban,
            payoutInvalidSwift: labels.payoutInvalidSwift,
            payoutInvalidPaypal: labels.payoutInvalidPaypal,
            email: labels.fieldEmail,
            phone: labels.fieldPhone,
            category: labels.fieldCategory,
            country: labels.fieldCountry,
            website: labels.fieldWebsite,
            status: labels.fieldStatus,
            statusActive: labels.statusActive,
            statusInactive: labels.statusInactive,
            messengers: labels.fieldMessengers,
            login: labels.login,
            oldPassword: labels.oldPassword,
            newPassword: labels.newPassword,
            passwordHint: labels.passwordHint,
            passwordWrong: labels.passwordWrong,
            passwordUpdated: labels.passwordUpdated,
            save: labels.save,
            saving: labels.saving,
            saved: labels.saved,
            nameRequired: labels.nameRequired,
            idsRequired: labels.idsRequired,
          }}
          onUpdated={setPartner}
        />
      ) : null}

      {tab === "bookings" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={labels.earned} value={money(partner.earnedUsd)} accent="green" />
            <StatCard label={labels.paid} value={money(partner.paidUsd)} />
            <StatCard label={labels.unpaid} value={money(partner.unpaidUsd)} accent="amber" />
            <StatCard label={labels.bookings} value={String(partner.referralBookings)} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <CabinetDateField
                label={labels.dateFrom}
                value={dateFromDraft}
                onChange={setDateFromDraft}
              />
              <CabinetDateField
                label={labels.dateTo}
                value={dateToDraft}
                onChange={setDateToDraft}
              />
              <button
                type="button"
                onClick={() => {
                  setDateFrom(dateFromDraft);
                  setDateTo(dateToDraft);
                }}
                className="min-h-11 rounded-xl bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white hover:bg-[#152a5c] sm:min-h-0"
              >
                {labels.search}
              </button>
              {dateFrom || dateTo || dateFromDraft || dateToDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    setDateFromDraft("");
                    setDateToDraft("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:min-h-0"
                >
                  {labels.clearDates}
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-extrabold text-[#0b1f4b]">{labels.earningsTitle}</p>
            {filteredEarnings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">{labels.earningsEmpty}</p>
            ) : (
              <ResponsiveDataList
                className="mt-3"
                desktop={
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3 font-semibold">{labels.colBooking}</th>
                        <th className="py-2 pr-3 font-semibold">{labels.colBookingDate}</th>
                        <th className="py-2 pr-3 font-semibold">{labels.colCustomer}</th>
                        <th className="py-2 pr-3 font-semibold">{labels.colEmail}</th>
                        <th className="py-2 pr-3 font-semibold">{labels.colPartner}</th>
                        <th className="py-2 font-semibold">{labels.colStatus}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEarnings.map((row) => {
                        const name =
                          [row.customerFirstName, row.customerLastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim() ||
                          row.customerName ||
                          "—";
                        const transferred = row.unpaidUsd <= 0;
                        return (
                          <tr key={row.id}>
                            <td className="py-2.5 pr-3 font-mono font-bold text-[#0b1f4b]">
                              {row.bookingRef}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-700">
                              {formatBookingDate(row.createdAt)}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-700">{name}</td>
                            <td className="py-2.5 pr-3 text-slate-600">{row.customerEmail || "—"}</td>
                            <td className="py-2.5 pr-3 font-extrabold text-emerald-700">
                              {money(row.amountUsd)}
                            </td>
                            <td
                              className={[
                                "py-2.5 text-sm font-bold",
                                transferred ? "text-emerald-700" : "text-amber-700",
                              ].join(" ")}
                            >
                              {transferred
                                ? labels.statusTransferred
                                : labels.statusPendingPayout}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                }
                mobile={
                  <>
                    {filteredEarnings.map((row) => {
                      const name =
                        [row.customerFirstName, row.customerLastName]
                          .filter(Boolean)
                          .join(" ")
                          .trim() ||
                        row.customerName ||
                        "—";
                      const transferred = row.unpaidUsd <= 0;
                      return (
                        <MobileDataCard key={row.id}>
                          <MobileDataRow label={labels.colBooking}>
                            <span className="font-mono">{row.bookingRef}</span>
                          </MobileDataRow>
                          <MobileDataRow label={labels.colBookingDate}>
                            {formatBookingDate(row.createdAt)}
                          </MobileDataRow>
                          <MobileDataRow label={labels.colCustomer}>{name}</MobileDataRow>
                          <MobileDataRow label={labels.colEmail}>
                            {row.customerEmail || "—"}
                          </MobileDataRow>
                          <MobileDataRow label={labels.colPartner}>
                            <span className="text-emerald-700">{money(row.amountUsd)}</span>
                          </MobileDataRow>
                          <MobileDataRow label={labels.colStatus}>
                            <span
                              className={
                                transferred ? "text-emerald-700" : "text-amber-700"
                              }
                            >
                              {transferred
                                ? labels.statusTransferred
                                : labels.statusPendingPayout}
                            </span>
                          </MobileDataRow>
                        </MobileDataCard>
                      );
                    })}
                  </>
                }
              />
            )}
          </div>
        </div>
      ) : null}

      {tab === "tools" ? (
        <BusinessPartnerIntegrationTools
          code={partner.referralCode}
          referralUrl={referralUrl}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={[
          "mt-1 text-xl font-extrabold",
          accent === "green" ? "text-green-600" : "",
          accent === "amber" ? "text-amber-700" : "",
          !accent ? "text-[#0b1f4b]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
