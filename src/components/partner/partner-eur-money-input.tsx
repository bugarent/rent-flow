"use client";

import { useState, type ReactNode } from "react";
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
  symbolOutside = false,
}: {
  eurValue: string;
  onEurChange: (eur: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  trailing?: ReactNode;
  /** Show the currency sign and code next to the box instead of inside it. */
  symbolOutside?: boolean;
}) {
  const { pricingCurrency, fxRates, fromEur } = usePartnerMoney();
  const symbol = partnerCurrencySymbol(pricingCurrency);
  const [draftState, setDraftState] = useState<{ text: string; currency: string } | null>(null);
  // Typed text belongs to the currency it was typed in; after a switch the converted amount shows.
  const draft = draftState && draftState.currency === pricingCurrency ? draftState.text : null;
  const setDraft = (text: string | null) =>
    setDraftState(text == null ? null : { text, currency: pricingCurrency });

  const shown =
    draft ??
    (String(eurValue).trim() === ""
      ? ""
      : formatPartnerAmount(fromEur(Number(eurValue) || 0)));

  const input = (
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
      className={cn(symbolOutside ? "px-2 text-base md:text-sm" : "pl-8 text-base md:text-sm", className)}
    />
  );

  if (symbolOutside) {
    return (
      <div className="inline-flex items-center gap-1.5">
        {input}
        <span className={cn("whitespace-nowrap text-sm font-extrabold text-slate-700", disabled && "opacity-50")}>
          {symbol}
          <span className="ml-1 text-[11px] font-bold text-slate-500">{pricingCurrency}</span>
        </span>
        {trailing}
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
        {symbol}
      </span>
      {input}
      {trailing}
    </div>
  );
}
