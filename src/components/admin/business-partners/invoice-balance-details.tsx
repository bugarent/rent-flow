"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { uiLocaleTag } from "@/lib/i18n/ui-text";
import type {
  BusinessPartnerAdmin,
  BusinessPartnerBalanceLine,
} from "@/lib/catalog/business-partners";

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

type BalancePayload = {
  lines: BusinessPartnerBalanceLine[];
  unpaidTotalUsd: number;
};

/** Invoice “დეტალები” — unpaid booking earnings still on the partner balance. */
export function InvoiceBalanceDetailsModal({
  partner,
  onClose,
  onTransfer,
}: {
  partner: BusinessPartnerAdmin;
  onClose: () => void;
  onTransfer?: () => void;
}) {
  const L = useBpLabels();
  const [lines, setLines] = useState<BusinessPartnerBalanceLine[]>([]);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const res = await fetch(`/api/admin/business-partners/${partner.id}/earnings`, {
          cache: "no-store",
        });
        const data = (await res.json()) as BalancePayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "load-failed");
          return;
        }
        if (cancelled) return;
        setLines(Array.isArray(data.lines) ? data.lines : []);
        setUnpaidTotal(Number(data.unpaidTotalUsd) || 0);
      } catch {
        if (!cancelled) setError("load-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partner.id]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="text-lg font-extrabold text-[#0b1f4b]">{L.balanceTitle}</p>
            <p className="text-sm text-slate-600">{partner.fullName}</p>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              {L.balanceTotal}{" "}
              {money(unpaidTotal || Math.max(0, partner.earnedUsd - partner.paidUsd))}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            {L.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {loading ? <p className="py-6 text-center text-sm text-slate-500">{L.loading}</p> : null}
          {error ? (
            <p className="py-4 text-sm font-semibold text-rose-600">
              {error === "load-failed" ? L.bookingsLoadFailed : error}
            </p>
          ) : null}
          {!loading && !error && lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {L.balanceEmpty}
            </p>
          ) : null}
          {!loading && lines.length > 0 ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 font-semibold">{L.booking}</th>
                  <th className="px-2 py-2 font-semibold">{L.date}</th>
                  <th className="px-2 py-2 font-semibold">{L.airport}</th>
                  <th className="px-2 py-2 font-semibold">{L.customer}</th>
                  <th className="px-2 py-2 font-semibold">{L.earned}</th>
                  <th className="px-2 py-2 font-semibold">{L.due}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-mono font-bold text-[#0b1f4b]">
                      {line.bookingRef}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{formatWhen(line.createdAt, L.locale)}</td>
                    <td className="px-2 py-2 text-slate-700">{line.airport || "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{line.customerName || "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{money(line.amountUsd)}</td>
                    <td className="px-2 py-2 font-semibold text-amber-700">
                      {money(line.unpaidUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {onTransfer && unpaidTotal > 0 ? (
          <div className="shrink-0 border-t px-4 py-3">
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              onClick={onTransfer}
            >
              {L.transfer}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
