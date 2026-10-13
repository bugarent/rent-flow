"use client";

import { PartnerEurMoneyInput } from "@/components/partner/partner-eur-money-input";
import { usePartnerMoney } from "@/components/providers/partner-money-context";
import { isFreeDeliveryLimit } from "@/lib/delivery/pricing";
import { formatPartnerAmount, partnerCurrencySymbol } from "@/lib/partners/pricing-currency";
import { cn } from "@/lib/utils";

/**
 * One-way delivery price for a partner location. Admin limit 0 → always free
 * (no input); otherwise the price is kept between 0 and the admin limit.
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

  if (isFreeDeliveryLimit(maxDeliveryPriceEur)) {
    return (
      <span
        className={cn(
          "inline-flex min-h-8 items-center rounded-full bg-emerald-100 px-3 text-xs font-extrabold uppercase tracking-wide text-emerald-800",
          disabled && "opacity-50",
        )}
      >
        {freeLabel}
      </span>
    );
  }

  const maxText = `${partnerCurrencySymbol(pricingCurrency)}${formatPartnerAmount(fromEur(maxDeliveryPriceEur))}`;
  return (
    <div className={cn("flex flex-col gap-0.5", align === "end" ? "items-end" : "items-start")}>
      <PartnerEurMoneyInput
        eurValue={priceEur}
        disabled={disabled}
        symbolOutside
        onEurChange={(eur) => {
          const n = Number(eur);
          if (eur !== "" && Number.isFinite(n) && n > maxDeliveryPriceEur) {
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
      <span className="text-[11px] font-semibold text-slate-500">{maxLabel.replace("{amount}", maxText)}</span>
    </div>
  );
}
