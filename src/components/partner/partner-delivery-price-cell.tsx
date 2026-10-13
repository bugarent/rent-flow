"use client";

import { PartnerEurMoneyInput } from "@/components/partner/partner-eur-money-input";
import { usePartnerMoney } from "@/components/providers/partner-money-context";
import { hasDeliveryPriceLimit } from "@/lib/delivery/pricing";
import { formatPartnerAmount, partnerCurrencySymbol } from "@/lib/partners/pricing-currency";
import { cn } from "@/lib/utils";

/**
 * One-way delivery price for a partner location. 0 = free delivery. When the
 * admin has set a limit, the price is kept between 0 and that limit.
 */
export function PartnerDeliveryPriceCell({
  priceEur,
  maxDeliveryPriceEur,
  disabled,
  freeLabel,
  maxLabel,
  align = "start",
  onPriceChange,
  onCapped,
}: {
  priceEur: string;
  maxDeliveryPriceEur: number;
  disabled?: boolean;
  freeLabel: string;
  /** e.g. "max {amount}" */
  maxLabel: string;
  align?: "start" | "end";
  onPriceChange: (eur: string) => void;
  onCapped: (maxText: string) => void;
}) {
  const { pricingCurrency, fromEur } = usePartnerMoney();
  const limited = hasDeliveryPriceLimit(maxDeliveryPriceEur);
  const maxText = `${partnerCurrencySymbol(pricingCurrency)}${formatPartnerAmount(fromEur(maxDeliveryPriceEur))}`;
  const isFree = (Number(priceEur) || 0) <= 0;

  return (
    <div className={cn("flex flex-col gap-0.5", align === "end" ? "items-end" : "items-start")}>
      <PartnerEurMoneyInput
        eurValue={priceEur}
        disabled={disabled}
        symbolOutside
        onEurChange={(eur) => {
          const n = Number(eur);
          if (limited && eur !== "" && Number.isFinite(n) && n > maxDeliveryPriceEur) {
            onPriceChange(String(maxDeliveryPriceEur));
            onCapped(maxText);
            return;
          }
          onPriceChange(eur);
        }}
        className={cn(
          "min-h-9 w-24 rounded-md border border-slate-200 bg-white py-1 font-bold text-slate-900 disabled:opacity-50",
          align === "end" && "text-end",
        )}
      />
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        {isFree ? (
          <span className="rounded-full bg-emerald-100 px-2 py-px font-extrabold uppercase tracking-wide text-emerald-800">
            {freeLabel}
          </span>
        ) : null}
        {limited ? <span>{maxLabel.replace("{amount}", maxText)}</span> : null}
      </span>
    </div>
  );
}
