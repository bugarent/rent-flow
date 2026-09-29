"use client";

import { useEffect, useState } from "react";
import { FREE_CANCEL_HOURS, PROTECTION_CANCEL_HOURS } from "@/lib/bookings/guest-cancellation";
import type { Copy } from "./types";

export function GuestCancelDialog({
  t,
  open,
  busy,
  refundEur,
  siteFeeEur,
  depositPercent,
  hoursLeft,
  hasProtection,
  onClose,
  onConfirm,
}: {
  t: Copy;
  open: boolean;
  busy: boolean;
  /** Amount that will actually be refunded (0 when outside the free-cancel window). */
  refundEur: number;
  /** Site % of the full booking — always shown in the amber box. */
  siteFeeEur: number;
  depositPercent: number;
  hoursLeft: number;
  hasProtection: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const willRefund = refundEur > 0;
  const displayAmount = willRefund ? refundEur : siteFeeEur;
  const under48Hours = hoursLeft < FREE_CANCEL_HOURS;
  const underProtectionWindow = hoursLeft < PROTECTION_CANCEL_HOURS;

  useEffect(() => {
    if (!open) {
      setReason("");
      setMissing(false);
    }
  }, [open]);

  if (!open) return null;

  const hoursMessage = (() => {
    if (willRefund) {
      return t.cancelHoursLeft.replace("{hours}", String(Math.max(0, Math.round(hoursLeft))));
    }
    if (hasProtection && underProtectionWindow) {
      return t.cancelUnder2WithProtection;
    }
    if (under48Hours) {
      return t.cancelUnder48NoProtection;
    }
    return t.cancelHoursLeft.replace("{hours}", String(Math.max(0, Math.round(hoursLeft))));
  })();

  return (
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-cancel-title"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const text = reason.trim();
          if (!text) {
            setMissing(true);
            return;
          }
          onConfirm(text);
        }}
      >
        <h2 id="guest-cancel-title" className="text-lg font-extrabold leading-snug text-[#0b1f4b]">
          {t.cancelReasonTitle}
        </h2>
        <textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (missing) setMissing(false);
          }}
          rows={4}
          maxLength={1000}
          placeholder={t.cancelReasonPlaceholder}
          className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
        />
        {missing ? <p className="mt-2 text-sm font-semibold text-rose-700">{t.cancelReasonRequired}</p> : null}
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{hoursMessage}</p>
        {displayAmount > 0 ? (
          <div
            className={
              willRefund
                ? "mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950"
                : "mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-rose-950"
            }
          >
            <p
              className={
                willRefund
                  ? "text-[11px] font-bold uppercase tracking-wide text-amber-800/90"
                  : "text-[11px] font-bold uppercase tracking-wide text-rose-800/90"
              }
            >
              {willRefund ? t.refundable : t.cancelFeeKeptTitle}
            </p>
            <p
              className={
                willRefund
                  ? "mt-0.5 text-lg font-black tabular-nums text-amber-900"
                  : "mt-0.5 text-lg font-black tabular-nums text-rose-900"
              }
            >
              €{displayAmount.toFixed(2)}
            </p>
            <p
              className={
                willRefund
                  ? "mt-1 text-[11px] font-semibold tabular-nums text-amber-800/90"
                  : "mt-1 text-[11px] font-semibold tabular-nums text-rose-800/90"
              }
            >
              {depositPercent}%
            </p>
            <p
              className={
                willRefund
                  ? "mt-1 text-[11px] font-medium leading-snug text-amber-800/80"
                  : "mt-1 text-[11px] font-medium leading-snug text-rose-800/80"
              }
            >
              {willRefund ? t.cancelRefundableHint : t.cancelFeeKept}
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-rose-900">
            {t.cancelFeeKept}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            {t.back}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {t.cancelSubmit}
          </button>
        </div>
      </form>
    </div>
  );
}
