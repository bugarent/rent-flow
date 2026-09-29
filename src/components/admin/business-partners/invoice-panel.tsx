"use client";

import { useEffect, useMemo, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { InvoiceBalanceDetailsModal } from "@/components/admin/business-partners/invoice-balance-details";
import { BusinessPartnerTransferModal } from "@/components/admin/business-partners/transfer-modal";
import type { BusinessPartnerAdmin } from "@/lib/catalog/business-partners";
import { worldCountryName } from "@/lib/catalog/world-countries";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function unpaid(p: BusinessPartnerAdmin) {
  return Math.max(0, (Number(p.earnedUsd) || 0) - (Number(p.paidUsd) || 0));
}

type EarnSort = "desc" | "asc";

export function BusinessPartnerInvoicePanel({
  partners,
  onPartnerUpdated,
  onPartnerDeleted,
}: {
  partners: BusinessPartnerAdmin[];
  onPartnerUpdated?: (partner: BusinessPartnerAdmin) => void;
  onPartnerDeleted?: (partnerId: string) => void;
}) {
  const L = useBpLabels();
  const [minDueText, setMinDueText] = useState("");
  const [earnSort, setEarnSort] = useState<EarnSort>("desc");
  const [details, setDetails] = useState<BusinessPartnerAdmin | null>(null);
  const [transferTarget, setTransferTarget] = useState<BusinessPartnerAdmin | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const removePartner = async (p: BusinessPartnerAdmin) => {
    if (
      !window.confirm(
        `${L.confirmDelete}\n${p.fullName} (${p.email || p.referralCode})`,
      )
    ) {
      return;
    }
    setDeletingId(p.id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/business-partners/${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : L.deleteFailed);
      }
      if (details?.id === p.id) setDetails(null);
      onPartnerDeleted?.(p.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : L.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const minDue = useMemo(() => {
    const cleaned = minDueText.trim().replace(",", ".");
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [minDueText]);

  const earners = useMemo(() => {
    const list = [...partners].filter((p) => {
      if (p.status !== "ACTIVE" && p.status !== "DISABLED") return false;
      const due = unpaid(p);
      if (minDue > 0) return due >= minDue;
      // Default: show every active partner (including $0) so new partners are visible.
      return true;
    });
    list.sort((a, b) => {
      const ad = unpaid(a);
      const bd = unpaid(b);
      if (ad !== bd) return earnSort === "desc" ? bd - ad : ad - bd;
      const ae = Number(a.earnedUsd) || 0;
      const be = Number(b.earnedUsd) || 0;
      return earnSort === "desc" ? be - ae : ae - be;
    });
    return list;
  }, [partners, minDue, earnSort]);

  const totalDue = earners.reduce((acc, p) => acc + unpaid(p), 0);

  const openTransfer = (p: BusinessPartnerAdmin) => {
    setTransferTarget(p);
  };

  const detailsModal =
    mounted && details ? (
      <InvoiceBalanceDetailsModal
        partner={details}
        onClose={() => setDetails(null)}
        onTransfer={
          unpaid(details) > 0
            ? () => {
                setDetails(null);
                openTransfer(details);
              }
            : undefined
        }
      />
    ) : null;

  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{L.invoice}</h2>
          <p className="text-xs text-slate-500">
            {L.invoiceHint} · {L.dueTotal} {money(totalDue)} · {earners.length} {L.records}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {L.minDue}
            <input
              type="text"
              inputMode="decimal"
              value={minDueText}
              onChange={(e) => setMinDueText(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder={L.example100}
              className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {L.sortPrice}
            <select
              value={earnSort}
              onChange={(e) => setEarnSort(e.target.value as EarnSort)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            >
              <option value="desc">{L.highToLow}</option>
              <option value="asc">{L.lowToHigh}</option>
            </select>
          </label>
        </div>
      </div>

      {deleteError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {deleteError}
        </p>
      ) : null}

      <ResponsiveDataList
        desktop={
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-100">
                <th className="w-10 px-2 py-3">#</th>
                <th className="px-2 py-3">{L.partner}</th>
                <th className="w-24 px-2 py-3">{L.country}</th>
                <th className="w-28 px-2 py-3">{L.code}</th>
                <th className="w-16 px-2 py-3">{L.bookings}</th>
                <th className="w-28 px-2 py-3">{L.earned}</th>
                <th className="w-24 px-2 py-3">{L.paid}</th>
                <th className="w-28 px-2 py-3">
                  <button
                    type="button"
                    onClick={() => setEarnSort((s) => (s === "desc" ? "asc" : "desc"))}
                    className="inline-flex items-center gap-1 font-semibold hover:text-[#1d6fe8]"
                  >
                    {L.due}
                    <span className="text-[10px] text-slate-500" aria-hidden>
                      {earnSort === "desc" ? "↓" : "↑"}
                    </span>
                  </button>
                </th>
                <th className="w-52 px-2 py-3">{L.actions}</th>
              </tr>
            </thead>
            <tbody>
              {earners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    {L.noEarners}
                  </td>
                </tr>
              ) : (
                earners.map((p, idx) => {
                  const due = unpaid(p);
                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="px-2 py-2.5 text-slate-500">{idx + 1}</td>
                      <td className="truncate px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => setDetails(p)}
                          className="max-w-full truncate font-semibold text-[#0b1f4b] hover:underline"
                          title={p.fullName}
                        >
                          {p.fullName}
                        </button>
                      </td>
                      <td className="truncate px-2 py-2.5 text-slate-700">
                        {p.countryIso2 ? worldCountryName(p.countryIso2) : "—"}
                      </td>
                      <td className="truncate px-2 py-2.5 font-mono font-bold text-[#0b1f4b]">
                        {p.referralCode}
                      </td>
                      <td className="px-2 py-2.5">{Number(p.referralBookings) || 0}</td>
                      <td className="px-2 py-2.5 font-semibold text-green-600">
                        {money(Number(p.earnedUsd) || 0)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600">{money(Number(p.paidUsd) || 0)}</td>
                      <td className="px-2 py-2.5 font-semibold text-amber-700">{money(due)}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setDetails(p)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50"
                          >
                            {L.details}
                          </button>
                          <button
                            type="button"
                            disabled={due <= 0}
                            onClick={() => openTransfer(p)}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {L.transfer}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === p.id}
                            onClick={() => void removePartner(p)}
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            {deletingId === p.id ? "…" : L.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        }
        mobile={
          earners.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {L.noEarners}
            </p>
          ) : (
            earners.map((p, idx) => {
              const due = unpaid(p);
              return (
                <MobileDataCard key={p.id}>
                  <MobileDataRow label="#">
                    <span className="text-slate-500">{idx + 1}</span>
                  </MobileDataRow>
                  <MobileDataRow label={L.partner}>
                    <button
                      type="button"
                      onClick={() => setDetails(p)}
                      className="text-end font-semibold text-[#0b1f4b] hover:underline"
                    >
                      {p.fullName}
                    </button>
                  </MobileDataRow>
                  <MobileDataRow label={L.country}>
                    {p.countryIso2 ? worldCountryName(p.countryIso2) : "—"}
                  </MobileDataRow>
                  <MobileDataRow label={L.code}>
                    <span className="font-mono font-bold text-[#0b1f4b]">{p.referralCode}</span>
                  </MobileDataRow>
                  <MobileDataRow label={L.bookings}>
                    {Number(p.referralBookings) || 0}
                  </MobileDataRow>
                  <MobileDataRow label={L.earned}>
                    <span className="font-semibold text-green-600">
                      {money(Number(p.earnedUsd) || 0)}
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label={L.paid}>
                    {money(Number(p.paidUsd) || 0)}
                  </MobileDataRow>
                  <MobileDataRow label={L.due}>
                    <span className="font-semibold text-amber-700">{money(due)}</span>
                  </MobileDataRow>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setDetails(p)}
                      className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50"
                    >
                      {L.details}
                    </button>
                    <button
                      type="button"
                      disabled={due <= 0}
                      onClick={() => openTransfer(p)}
                      className="min-h-11 flex-1 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {L.transfer}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      onClick={() => void removePartner(p)}
                      className="min-h-11 flex-1 rounded-md bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      {deletingId === p.id ? "…" : L.delete}
                    </button>
                  </div>
                </MobileDataCard>
              );
            })
          )
        }
      />

      {detailsModal}
      {transferTarget ? (
        <BusinessPartnerTransferModal
          partner={transferTarget}
          onClose={() => setTransferTarget(null)}
          onPartnerUpdated={(next) => {
            onPartnerUpdated?.(next as BusinessPartnerAdmin);
            setTransferTarget((prev) => {
              if (!prev) return null;
              const { payoutMethod: _method, ...rest } = next;
              return { ...prev, ...rest };
            });
          }}
        />
      ) : null}
    </section>
  );
}
