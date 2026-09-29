import { RefundChangeDetailsView } from "@/components/admin/refund-change-details-view";
import type { BookingInfoData, BookingInfoRole, Copy } from "../types";

export function HeaderBanners({
  t,
  locale,
  booking,
  role,
  readOnly,
  canEditAll,
  busy,
  error,
  onConfirmPending,
  calendarView = false,
}: {
  t: Copy;
  locale: string;
  booking: BookingInfoData;
  role: BookingInfoRole;
  readOnly: boolean;
  canEditAll: boolean;
  busy: boolean;
  error: string;
  onConfirmPending?: () => void | Promise<void>;
  calendarView?: boolean;
}) {
  return (
    <>
      {readOnly && !calendarView ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
          {t.viewOnly}
        </p>
      ) : null}
      {booking.pendingChanges && role === "admin" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-amber-950">{t.pendingBanner}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirmPending?.()}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {t.confirmChanges}
          </button>
        </div>
      ) : null}
      {canEditAll && (booking.adminRefundAlerts?.length ?? 0) > 0 ? (
        <div className="space-y-2 rounded-xl border-2 border-rose-400 bg-rose-50 px-3 py-3 text-rose-950 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-rose-800">
            {t.refundAlertTitle}
          </p>
          {(booking.adminRefundAlerts || []).map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border border-rose-200 bg-white/80 px-3 py-2"
            >
              <RefundChangeDetailsView
                changes={alert.changes}
                fallbackReason={alert.reason}
                locale={locale}
                showSiteFeeShare
              />
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-rose-700/80">
                {t.refundAlertAmount}
              </p>
              <p className="text-xl font-black tabular-nums text-rose-800">
                €{Number(alert.amountEur).toFixed(2)}
                <span className="ms-2 text-xs font-bold text-rose-600">
                  ({alert.depositPercent}%)
                </span>
              </p>
            </div>
          ))}
          <p className="text-[11px] font-medium text-rose-700/90">{t.refundAlertHint}</p>
        </div>
      ) : null}
      {role === "admin" && booking.businessPartnerCode ? (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-[#0b1f4b]">
          {locale === "ka"
            ? "ბიზნეს პარტნიორის კოდი"
            : locale === "ru"
              ? "Код бизнес-партнёра"
              : "Business partner code"}
          {": "}
          <span className="font-mono tracking-wide">{booking.businessPartnerCode}</span>
        </p>
      ) : null}
      {role === "admin" && booking.status === "CANCELLED" && booking.cancellationReason ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-800">{t.cancelReasonAdmin}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-rose-950">
            {booking.cancellationReason}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
    </>
  );
}
