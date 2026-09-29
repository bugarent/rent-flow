"use client";

import { cn } from "@/lib/utils";
import {
  formatRefundDateDisplay,
  type RefundChangeDetail,
} from "@/lib/bookings/refund-change-details";
import { AdminMoneyText } from "@/components/admin/admin-money-text";

export function RefundChangeDetailsView({
  changes,
  fallbackReason,
  locale = "ka",
  compact = false,
  showSiteFeeShare = true,
}: {
  changes?: RefundChangeDetail[] | null;
  fallbackReason?: string;
  locale?: string;
  compact?: boolean;
  /** Show per-line site-fee (deposit %) contribution when present. */
  showSiteFeeShare?: boolean;
}) {
  const list = Array.isArray(changes) ? changes : [];
  if (!list.length) {
    if (!fallbackReason) return null;
    return <span className="text-slate-500">{fallbackReason}</span>;
  }

  const labels =
    locale === "ka"
      ? {
          period: "პერიოდი",
          cancelled: "გაუქმებული",
          added: "დამატებული",
          siteShare: "დასაბრუნებელი",
        }
      : locale === "ru"
        ? {
            period: "Период",
            cancelled: "отменено",
            added: "добавлено",
            siteShare: "к возврату",
          }
        : {
            period: "Period",
            cancelled: "cancelled",
            added: "added",
            siteShare: "refund share",
          };

  return (
    <ul className={cn(compact ? "mt-0 space-y-0.5" : "mt-1 space-y-1.5", "text-xs text-slate-700")}>
      {list.map((c, idx) => {
        if (c.type === "dates") {
          const puFrom = formatRefundDateDisplay(c.pickupFrom);
          const puTo = formatRefundDateDisplay(c.pickupTo);
          const doFrom = formatRefundDateDisplay(c.dropoffFrom);
          const doTo = formatRefundDateDisplay(c.dropoffTo);
          const pickupChanged = puFrom !== puTo;
          const dropoffChanged = doFrom !== doTo;
          return (
            <li key={`dates-${idx}`} className="leading-snug">
              <span className="font-semibold text-slate-500">{labels.period}: </span>
              <span className="font-semibold tabular-nums">
                {pickupChanged ? (
                  <>
                    <span className="text-slate-400 line-through">{puFrom}</span>
                    {" "}
                    <span className="text-[#0b1f4b]">{puTo}</span>
                  </>
                ) : (
                  <span>{puFrom}</span>
                )}
                {" – "}
                {dropoffChanged ? (
                  <>
                    <span className="text-slate-400 line-through">{doFrom}</span>
                    {" "}
                    <span className="font-extrabold text-[#0b1f4b]">{doTo}</span>
                  </>
                ) : (
                  <span>{doFrom}</span>
                )}
              </span>
            </li>
          );
        }

        const from = Number(c.priceFromEur) || 0;
        const to = Number(c.priceToEur) || 0;
        const removed = to <= 0 && from > 0;
        const added = from <= 0 && to > 0;
        const increased = to > from + 0.005;
        const share = Number(c.siteFeeShareEur) || 0;

        return (
          <li key={`extra-${idx}-${c.label}`} className="leading-snug">
            <span className="font-semibold text-[#0b1f4b]">{c.label}: </span>
            <span className="tabular-nums">
              {added ? (
                <>
                  <span className="text-slate-400">{labels.added}</span>
                  {" → "}
                  <span className="font-extrabold text-emerald-800">
                    <AdminMoneyText amountEur={to} />
                  </span>
                </>
              ) : (
                <>
                  <span className="text-slate-400 line-through">
                    <AdminMoneyText amountEur={from} />
                  </span>
                  {" → "}
                  {removed ? (
                    <span className="font-bold text-rose-700">{labels.cancelled}</span>
                  ) : (
                    <span
                      className={
                        increased
                          ? "font-extrabold text-emerald-800"
                          : "font-extrabold text-[#0b1f4b]"
                      }
                    >
                      <AdminMoneyText amountEur={to} />
                    </span>
                  )}
                </>
              )}
            </span>
            {showSiteFeeShare && share > 0 ? (
              <span className="ms-1 font-bold tabular-nums text-rose-700">
                · {labels.siteShare} <AdminMoneyText amountEur={share} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
