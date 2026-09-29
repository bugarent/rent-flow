import type { FxRates } from "@/lib/fx";
import {
  DEFAULT_PARTNER_PRICING_CURRENCY,
  type PartnerPricingCurrency,
} from "@/lib/partners/company-settings";
import { convertFromEur, convertToEur, currencySymbol, formatAmountNumber, toNumber } from "@/lib/utils";

/** Format a partner-entered amount for inputs (trim trailing zeros lightly). */
export function formatPartnerAmount(amount: number): string {
  return formatAmountNumber(amount);
}

/** Convert partner-currency input → EUR for DB / public listings. */
export function partnerAmountToEur(
  amount: string | number | null | undefined,
  currency: PartnerPricingCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  rates: FxRates,
): number {
  return convertToEur(toNumber(amount, 0), currency, rates);
}

/** Convert stored EUR → partner working currency for form fields. */
export function eurToPartnerAmount(
  amountEur: string | number | null | undefined,
  currency: PartnerPricingCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  rates: FxRates,
): string {
  return formatPartnerAmount(convertFromEur(toNumber(amountEur, 0), currency, rates));
}

export function partnerCurrencySymbol(
  currency: PartnerPricingCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
): string {
  return currencySymbol(currency);
}

/** Re-express an amount when the partner switches working currency. */
export function rebasePartnerAmount(
  amount: string | number,
  from: PartnerPricingCurrency,
  to: PartnerPricingCurrency,
  rates: FxRates,
): string {
  if (from === to) return formatPartnerAmount(toNumber(amount, 0));
  const eur = convertToEur(toNumber(amount, 0), from, rates);
  return formatPartnerAmount(convertFromEur(eur, to, rates));
}
