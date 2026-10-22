import type { FxRates } from "@/lib/fx";
import type { Currency } from "@/lib/i18n/config";
import { DEFAULT_PARTNER_PRICING_CURRENCY } from "@/lib/partners/company-settings";
import { convertFromEur, convertToEur, currencySymbol, formatAmountNumber, toNumber } from "@/lib/utils";

/** Currency partner amounts are shown and typed in (partner header, or admin header when admin reviews). */
export type PartnerDisplayCurrency = Currency;

/** Format a partner-entered amount for inputs (trim trailing zeros lightly). */
export function formatPartnerAmount(amount: number): string {
  return formatAmountNumber(amount);
}

/** Convert partner-currency input → EUR for DB / public listings. */
export function partnerAmountToEur(
  amount: string | number | null | undefined,
  currency: PartnerDisplayCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  rates: FxRates,
): number {
  return convertToEur(toNumber(amount, 0), currency, rates);
}

/** Convert stored EUR → partner working currency for form fields. */
export function eurToPartnerAmount(
  amountEur: string | number | null | undefined,
  currency: PartnerDisplayCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  rates: FxRates,
): string {
  return formatPartnerAmount(convertFromEur(toNumber(amountEur, 0), currency, rates));
}

export function partnerCurrencySymbol(
  currency: PartnerDisplayCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
): string {
  return currencySymbol(currency);
}

/** Re-express an amount when the partner switches working currency. */
export function rebasePartnerAmount(
  amount: string | number,
  from: PartnerDisplayCurrency,
  to: PartnerDisplayCurrency,
  rates: FxRates,
): string {
  if (from === to) return formatPartnerAmount(toNumber(amount, 0));
  const eur = convertToEur(toNumber(amount, 0), from, rates);
  return formatPartnerAmount(convertFromEur(eur, to, rates));
}
