import { cn } from "@/lib/utils";
import { CARD_PICKUP_SURCHARGE_PERCENT } from "@/lib/cars/reserve-pricing";
import type { BookingInfoData, Copy, ExtrasPaymentBreakdown } from "../types";

export function FooterActions({
  t,
  locale,
  booking,
  liveTotal,
  extrasPaymentBreakdown,
  canEditAll,
  canEditGuestFields,
  canEditExtras,
  readOnly,
  busy,
  hideRefundable = false,
  onSaveAdmin,
  onSubmitGuestChanges,
  onDeleteBooking,
  onOpenInvoice,
  onDelete,
}: {
  t: Copy;
  locale: string;
  booking: BookingInfoData;
  liveTotal: number;
  extrasPaymentBreakdown: ExtrasPaymentBreakdown;
  canEditAll: boolean;
  canEditGuestFields: boolean;
  canEditExtras: boolean;
  readOnly: boolean;
  busy: boolean;
  /** Hide the amber refundable box (e.g. while the cancel dialog is open). */
  hideRefundable?: boolean;
  onSaveAdmin: () => void;
  onSubmitGuestChanges: (payNow: boolean) => void;
  onDeleteBooking: () => void;
  onOpenInvoice?: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  if (!(((canEditGuestFields || canEditAll) && !readOnly) || onDelete)) return null;

  const refundAlert = canEditAll && (booking.adminRefundAlerts?.length ?? 0) > 0;
  const customerPrice = canEditGuestFields && !refundAlert;
  const labelTone = customerPrice
    ? "text-[11px] font-semibold uppercase leading-snug text-[#1a4f93]"
    : "text-[11px] font-semibold uppercase leading-snug text-emerald-800/80";
  const showTripRefund =
    !hideRefundable && extrasPaymentBreakdown.refundableSiteFeeEur >= 0.02;

  return (
    <div className="z-10 shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-stretch">
        {(canEditGuestFields || canEditAll) && !readOnly ? (
          <div
            className={cn(
              "rounded-xl border p-3 text-sm lg:col-start-1",
              refundAlert
                ? "border-rose-400 bg-rose-50 text-rose-950"
                : customerPrice
                  ? "border-[#b7d4f8] bg-[#d4e7fc] text-[#0b1f4b]"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950",
            )}
          >
            {canEditAll && (booking.adminRefundAlerts?.length ?? 0) > 0 ? (
              <div className="mb-2 rounded-lg border border-rose-300 bg-rose-100/80 px-2.5 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-rose-800">
                  {t.refundAlertAmount}
                </p>
                <p className="text-lg font-black tabular-nums text-rose-900">
                  €
                  {(booking.adminRefundAlerts || [])
                    .reduce((s, a) => s + (Number(a.amountEur) || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            ) : null}
            <div
              className={cn(
                "mb-2 grid grid-cols-2 gap-x-4 border-b pb-2",
                refundAlert
                  ? "border-rose-200/80"
                  : customerPrice
                    ? "border-[#b7d4f8]"
                    : "border-emerald-200/80",
              )}
            >
              <div className="min-w-0">
                <p className={labelTone}>{t.fullTotal}</p>
                <p
                  className={cn(
                    "mt-0.5 text-base font-black tabular-nums",
                    "text-[#0b1f4b]",
                  )}
                >
                  €{liveTotal.toFixed(2)}
                </p>
              </div>
              <div className="min-w-0">
                <p className={labelTone}>{t.amountPaid}</p>
                <p
                  className={cn(
                    "mt-0.5 text-base font-black tabular-nums",
                    "text-[#0b1f4b]",
                  )}
                >
                  €{extrasPaymentBreakdown.siteFeeEur.toFixed(2)}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px] font-semibold tabular-nums",
                    customerPrice ? "text-[#1a4f93]" : "text-emerald-800/70",
                  )}
                >
                  {extrasPaymentBreakdown.depositPercent}% €
                  {extrasPaymentBreakdown.siteFeeEur.toFixed(2)}
                  {extrasPaymentBreakdown.cardSurchargeEur > 0
                    ? ` + ${CARD_PICKUP_SURCHARGE_PERCENT}% €${extrasPaymentBreakdown.cardSurchargeEur.toFixed(2)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className={labelTone}>{t.dueWasAtPickup}</p>
                <p className="mt-0.5 font-extrabold tabular-nums">
                  €{extrasPaymentBreakdown.dueWas.toFixed(2)}
                </p>
              </div>
              <div className="min-w-0">
                <p className={labelTone}>{t.addingServicesValue}</p>
                <p className="mt-0.5 font-extrabold tabular-nums">
                  €{extrasPaymentBreakdown.addedServicesTotal.toFixed(2)}
                </p>
              </div>
              <div className="min-w-0">
                <p className={labelTone}>{t.payingNow}</p>
                <p
                  className={cn(
                    "mt-0.5 font-extrabold tabular-nums",
                    customerPrice ? "text-[#0b1f4b]" : "text-emerald-700",
                  )}
                >
                  €{extrasPaymentBreakdown.payNow.toFixed(2)}
                </p>
              </div>
              <div className="min-w-0">
                <p className={labelTone}>{t.dueWillAtPickup}</p>
                <p
                  className={cn(
                    "mt-0.5 font-extrabold tabular-nums",
                    "text-amber-800",
                  )}
                >
                  €{extrasPaymentBreakdown.dueWill.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block lg:col-start-1" />
        )}

        {(canEditExtras && !readOnly) || onDelete ? (
          <div className="flex flex-col justify-center gap-2 lg:col-start-2">
            {canEditAll && !readOnly ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSaveAdmin()}
                  className="w-full rounded-xl bg-[#1d6fe8] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {t.save}
                </button>
                {onOpenInvoice ? (
                  <button
                    type="button"
                    onClick={() => onOpenInvoice()}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-[#0b1f4b] hover:bg-slate-50"
                  >
                    {locale === "ka" ? "ინვოისი" : locale === "ru" ? "Инвойс" : "Invoice"}
                  </button>
                ) : null}
              </>
            ) : null}
            {canEditGuestFields && !readOnly ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void onSubmitGuestChanges(extrasPaymentBreakdown.payNow > 0)
                  }
                  className="w-full rounded-xl bg-emerald-600 px-3 py-[calc(0.625rem+0.5cm)] text-sm font-bold text-white disabled:opacity-50"
                >
                  {extrasPaymentBreakdown.payNow > 0
                    ? `${t.savePayment} €${extrasPaymentBreakdown.payNow.toFixed(2)}`
                    : t.savePayment}
                </button>
                {showTripRefund ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800/90">
                      {t.refundable}
                    </p>
                    <p className="mt-0.5 text-lg font-black tabular-nums text-amber-900">
                      €{extrasPaymentBreakdown.refundableSiteFeeEur.toFixed(2)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium leading-snug text-amber-800/80">
                      {t.refundableHint}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
            {canEditAll && !readOnly && showTripRefund ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800/90">
                  {t.refundable}
                </p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-amber-900">
                  €{extrasPaymentBreakdown.refundableSiteFeeEur.toFixed(2)}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-snug text-amber-800/80">
                  {t.refundableHint}
                </p>
              </div>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDeleteBooking()}
                className="w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                {t.deleteBooking}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
