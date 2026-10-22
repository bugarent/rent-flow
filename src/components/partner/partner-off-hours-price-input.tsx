"use client";

import { useState } from "react";
import { usePartnerMoneyOptional } from "@/components/providers/partner-money-context";
import type { FxRates } from "@/lib/fx";
import type { PartnerPricingCurrency } from "@/lib/partners/company-settings";
import { partnerCurrencySymbol, rebasePartnerAmount } from "@/lib/partners/pricing-currency";
import { cn } from "@/lib/utils";

/**
 * Off-hours fee is stored in the partner's working currency; it is shown and typed in the
 * header currency and converted back on change.
 */
export function PartnerOffHoursPriceInput({
  value,
  storeCurrency,
  fxRates,
  onChange,
  readOnly,
  className,
}: {
  value: string;
  storeCurrency: PartnerPricingCurrency;
  fxRates: FxRates;
  onChange: (stored: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const money = usePartnerMoneyOptional();
  const shownCurrency = money?.pricingCurrency ?? storeCurrency;
  const rates = money?.fxRates ?? fxRates;
  const [draft, setDraft] = useState<{ text: string; currency: string } | null>(null);

  const shown =
    draft && draft.currency === shownCurrency
      ? draft.text
      : String(value ?? "").trim() === ""
        ? ""
        : rebasePartnerAmount(value, storeCurrency, shownCurrency, rates);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        {partnerCurrencySymbol(shownCurrency)}
      </span>
      <input
        className={cn("ps-7", className)}
        inputMode="decimal"
        value={shown}
        readOnly={readOnly}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          setDraft({ text: raw, currency: shownCurrency });
          const blank = raw.trim() === "" || raw === "." || raw === "-";
          onChange(
            blank || shownCurrency === storeCurrency
              ? raw
              : rebasePartnerAmount(raw, shownCurrency, storeCurrency, rates),
          );
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}

/** Currency code shown next to money labels: header currency when present, else the stored one. */
export function useShownPartnerCurrency(storeCurrency: PartnerPricingCurrency) {
  return usePartnerMoneyOptional()?.pricingCurrency ?? storeCurrency;
}
