"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBookingRef } from "@/lib/ids";
import { cn } from "@/lib/utils";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
import { RefundChangeDetailsView } from "@/components/admin/refund-change-details-view";
import {
  BookingInfoModal,
  type BookingInfoData,
} from "@/components/bookings/booking-info-modal";
import type { RefundChangeDetail } from "@/lib/bookings/refund-change-details";

type RefundRow = {
  id: string;
  bookingId: string;
  sequentialNumber: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  amountEur: number;
  depositPercent: number;
  reason: string;
  changes?: RefundChangeDetail[];
  paymentSource: string;
  status: "PENDING" | "REFUNDED" | "CANCELLED";
  createdAt: string;
  refundedAt?: string;
};

function copy(locale: string) {
  if (locale === "ka") {
    return {
      title: "დასაბრუნებელი ინვოისები",
      empty: "დასაბრუნებელი განაცხადი ჯერ არ არის.",
      pending: "მოლოდინში",
      refunded: "დაბრუნებული",
      client: "კლიენტი",
      booking: "ჯავშანი",
      amount: "გადასარიცხი თანხა",
      reason: "მიზეზი",
      source: "გადახდის წყარო",
      refundBtn: "თანხის დაბრუნება",
      detailsBtn: "დეტალები",
      refundedAt: "დაბრუნების დრო",
      loadFailed: "ჩატვირთვა ვერ მოხერხდა",
      refundFailed: "დაბრუნება ვერ მოხერხდა",
      detailsFailed: "ჯავშნის დეტალები ვერ ჩაიტვირთა",
      confirm: "დავადასტუროთ თანხის დაბრუნება იმავე ანგარიშზე?",
    };
  }
  if (locale === "ru") {
    return {
      title: "Счета на возврат",
      empty: "Заявок на возврат пока нет.",
      pending: "Ожидает",
      refunded: "Возвращено",
      client: "Клиент",
      booking: "Бронь",
      amount: "Сумма к возврату",
      reason: "Причина",
      source: "Источник оплаты",
      refundBtn: "Вернуть средства",
      detailsBtn: "Детали",
      refundedAt: "Время возврата",
      loadFailed: "Не удалось загрузить",
      refundFailed: "Не удалось вернуть",
      detailsFailed: "Не удалось загрузить детали брони",
      confirm: "Подтвердить возврат на исходный счёт?",
    };
  }
  return {
    title: "Refund invoices",
    empty: "No refund requests yet.",
    pending: "Pending",
    refunded: "Refunded",
    client: "Client",
    booking: "Booking",
    amount: "Amount to return",
    reason: "Reason",
    source: "Payment source",
    refundBtn: "Refund payment",
    detailsBtn: "Details",
    refundedAt: "Refunded at",
    loadFailed: "Could not load",
    refundFailed: "Refund failed",
    detailsFailed: "Could not load booking details",
    confirm: "Confirm refund to the original payment account?",
  };
}

export function AdminBookingRefundsPanel() {
  const { locale } = useAdminLocale();
  const t = copy(locale);
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailsBusyId, setDetailsBusyId] = useState<string | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingInfoData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bookings/refunds", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t.loadFailed);
      setRows(Array.isArray(data.refunds) ? (data.refunds as RefundRow[]) : []);
      void fetch("/api/admin/bookings/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const processRefund = async (id: string) => {
    if (!window.confirm(t.confirm)) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/bookings/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundId: id, action: "refund" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t.refundFailed);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.refundFailed);
    } finally {
      setBusyId(null);
    }
  };

  const openDetails = async (bookingId: string) => {
    setDetailsBusyId(bookingId);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.booking) {
        throw new Error(typeof data.error === "string" ? data.error : t.detailsFailed);
      }
      setViewingBooking(data.booking as BookingInfoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.detailsFailed);
    } finally {
      setDetailsBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-[#0b1f4b]">{t.title}</h2>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {t.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const name = [r.guestFirstName, r.guestLastName].filter(Boolean).join(" ").trim() || "—";
            const pending = r.status === "PENDING";
            const contact = [r.guestEmail, r.guestPhone].filter(Boolean).join(" · ");
            return (
              <li
                key={r.id}
                className={cn(
                  "rounded-xl border bg-white px-3 py-2 shadow-sm",
                  pending ? "border-amber-300" : "border-slate-200",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t.booking}{" "}
                      <span className="font-mono text-sm text-[#0b1f4b]">
                        {formatBookingRef(r.sequentialNumber) || r.bookingId.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-sm font-extrabold leading-snug text-[#0b1f4b]">
                      {t.client}: {name}
                    </p>
                    {contact ? (
                      <p className="text-xs leading-snug text-slate-600">{contact}</p>
                    ) : null}
                    <div className="text-xs leading-snug text-slate-500">
                      <span>{t.reason}: </span>
                      <span className="inline-block align-top text-slate-700">
                        <RefundChangeDetailsView
                          changes={r.changes}
                          fallbackReason={r.reason}
                          locale={locale}
                          compact
                        />
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-500">
                      {t.source}: {r.paymentSource} · {r.depositPercent}%
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-500">{t.amount}</p>
                    <p className="text-xl font-black leading-none tabular-nums text-amber-800">
                      <AdminMoneyText amountEur={Number(r.amountEur)} />
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 inline-flex rounded-full px-1.5 py-px text-[9px] font-extrabold uppercase",
                        pending
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {pending ? t.pending : t.refunded}
                    </p>
                    {r.refundedAt ? (
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                        {t.refundedAt}: {new Date(r.refundedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={detailsBusyId === r.bookingId}
                    onClick={() => void openDetails(r.bookingId)}
                    className="rounded-lg bg-[#0b1f4b] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#14306a] disabled:opacity-50"
                  >
                    {t.detailsBtn}
                  </button>
                  {pending ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void processRefund(r.id)}
                      className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-[#0b1f4b] hover:bg-amber-400 disabled:opacity-50"
                    >
                      {t.refundBtn}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewingBooking ? (
        <BookingInfoModal
          open
          booking={viewingBooking}
          locale={locale}
          role="admin"
          catalogExtras={
            (
              viewingBooking as BookingInfoData & {
                catalogExtras?: Array<{ id: string; label: string; priceEurPerDay: number }>;
              }
            ).catalogExtras || []
          }
          onClose={() => setViewingBooking(null)}
          onSaved={(next) => {
            if (next) setViewingBooking(next);
            else setViewingBooking(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
