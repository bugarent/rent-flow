"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePartnerMoney } from "@/components/providers/partner-money-context";
import { formatPartnerAmount, partnerAmountToEur, partnerCurrencySymbol } from "@/lib/partners/pricing-currency";
import { cn } from "@/lib/utils";

/** Stored EUR amount edited in the partner's selected display currency. */
export function PartnerEurMoneyInput({
  eurValue,
  onEurChange,
  className,
  disabled,
  placeholder,
  trailing,
}: {
  eurValue: string;
  onEurChange: (eur: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  trailing?: ReactNode;
}) {
  const { pricingCurrency, fxRates, fromEur } = usePartnerMoney();
  const symbol = partnerCurrencySymbol(pricingCurrency);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [pricingCurrency]);

  const shown =
    draft ??
    (String(eurValue).trim() === ""
      ? ""
      : formatPartnerAmount(fromEur(Number(eurValue) || 0)));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
        {symbol}
      </span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={shown}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          setDraft(raw);
          if (raw.trim() === "" || raw === "." || raw === "-") {
            onEurChange(raw.trim() === "" ? "" : raw);
            return;
          }
          const eur = partnerAmountToEur(raw, pricingCurrency, fxRates);
          onEurChange(Number.isFinite(eur) ? String(eur) : "");
        }}
        onBlur={() => setDraft(null)}
        className={cn("pl-8 text-base md:text-sm", className)}
      />
      {trailing}
    </div>
  );
}
