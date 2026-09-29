"use client";

import { useMemo, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { uiLocaleTag } from "@/lib/i18n/ui-text";
import type {
  BusinessPartnerAdmin,
  BusinessPartnerEarning,
} from "@/lib/catalog/business-partners";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(uiLocaleTag(locale), {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function unpaidUsd(e: BusinessPartnerEarning) {
  return Math.max(0, (Number(e.amountUsd) || 0) - (Number(e.paidUsd) || 0));
}

/** Bookings whose partner payout transfer is fully completed. */
export function isTransferCompletedEarning(e: BusinessPartnerEarning): boolean {
  const paid = Number(e.paidUsd) || 0;
  if (paid <= 0) return false;
  return unpaidUsd(e) <= 0.005;
}

export type HistoryRow = BusinessPartnerEarning & {
  partnerName: string;
  partnerEmail: string;
};

export function BusinessPartnerHistoryPanel({
  earnings,
  partners,
}: {
  earnings: BusinessPartnerEarning[];
  partners: BusinessPartnerAdmin[];
}) {
  const L = useBpLabels();
  const [q, setQ] = useState("");

  const byId = useMemo(() => {
    const m = new Map<string, BusinessPartnerAdmin>();
    for (const p of partners) m.set(p.id, p);
    return m;
  }, [partners]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    const list: HistoryRow[] = earnings
      .filter(isTransferCompletedEarning)
      .map((e) => {
        const p = byId.get(e.partnerId);
        return {
          ...e,
          partnerName: p?.fullName || e.partnerId,
          partnerEmail: p?.email || "",
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (!needle) return list;
    return list.filter((row) => {
      const hay = [
        row.bookingRef,
        row.partnerName,
        row.partnerEmail,
        row.airport,
        row.customerName,
        row.customerEmail,
      ]
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, "");
      return hay.includes(needle);
    });
  }, [earnings, byId, q]);

  const totalPaid = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.paidUsd) || 0), 0),
    [rows],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-[#0b1f4b]">{L.history}</h2>
          <p className="text-sm text-slate-600">{L.historyBody}</p>
        </div>
        <label className="block min-w-0 sm:w-72">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {L.search}
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L.historySearch}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0b1f4b] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </label>
      </div>

      <p className="text-sm font-semibold text-slate-500">
        {rows.length} {L.booking.toLowerCase()} · {L.transferredTotal} {money(totalPaid)}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {L.noHistory}
        </p>
      ) : (
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#0b1f4b] text-[11px] uppercase tracking-wide text-white">
                    <th className="px-3 py-2.5 font-extrabold">{L.booking}</th>
                    <th className="px-3 py-2.5 font-extrabold">{L.date}</th>
                    <th className="px-3 py-2.5 font-extrabold">{L.partner}</th>
                    <th className="px-3 py-2.5 font-extrabold">{L.airport}</th>
                    <th className="px-3 py-2.5 font-extrabold">{L.customer}</th>
                    <th className="px-3 py-2.5 font-extrabold">{L.transferred}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs font-black text-[#0b1f4b]">
                        {row.bookingRef}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatWhen(row.createdAt, L.locale)}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-[#0b1f4b]">{row.partnerName}</p>
                        {row.partnerEmail ? (
                          <p className="text-xs text-slate-500">{row.partnerEmail}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.airport || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{row.customerName || "—"}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700">
                        {money(row.paidUsd || row.amountUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          mobile={rows.map((row) => (
            <MobileDataCard key={row.id}>
              <MobileDataRow label={L.booking}>
                <span className="font-mono text-xs font-black text-[#0b1f4b]">
                  {row.bookingRef}
                </span>
              </MobileDataRow>
              <MobileDataRow label={L.date}>{formatWhen(row.createdAt, L.locale)}</MobileDataRow>
              <MobileDataRow label={L.partner}>
                <div>
                  <p className="font-semibold text-[#0b1f4b]">{row.partnerName}</p>
                  {row.partnerEmail ? (
                    <p className="text-xs font-normal text-slate-500">{row.partnerEmail}</p>
                  ) : null}
                </div>
              </MobileDataRow>
              <MobileDataRow label={L.airport}>{row.airport || "—"}</MobileDataRow>
              <MobileDataRow label={L.customer}>{row.customerName || "—"}</MobileDataRow>
              <MobileDataRow label={L.transferred}>
                <span className="font-bold text-emerald-700">
                  {money(row.paidUsd || row.amountUsd)}
                </span>
              </MobileDataRow>
            </MobileDataCard>
          ))}
        />
      )}
    </section>
  );
}
