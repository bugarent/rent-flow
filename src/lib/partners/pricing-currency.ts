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

/** The amount as the partner typed it (or as stored in EUR) — every other currency is derived from it. */
type MoneyOrigin = { amount: number; currency: PartnerDisplayCurrency };

/**
 * Shown text → its origin, so switching EUR → USD → GEL → EUR converts from the original
 * amount each time instead of from the previous rounded figure (10 € stays 10 €).
 */
const moneyOrigins = new Map<string, MoneyOrigin>();
const MAX_MONEY_ORIGINS = 5000;

function originKey(text: string, currency: PartnerDisplayCurrency) {
  return `${currency}:${text}`;
}

function rememberOrigin(text: string, currency: PartnerDisplayCurrency, origin: MoneyOrigin) {
  if (typeof window === "undefined") return;
  if (moneyOrigins.size >= MAX_MONEY_ORIGINS) moneyOrigins.clear();
  moneyOrigins.set(originKey(text, currency), origin);
}

function originOf(amount: string | number, currency: PartnerDisplayCurrency): MoneyOrigin {
  const text = formatPartnerAmount(toNumber(amount, 0));
  return moneyOrigins.get(originKey(text, currency)) ?? { amount: toNumber(amount, 0), currency };
}

function exactEur(origin: MoneyOrigin, rates: FxRates): number {
  if (origin.currency === "EUR") return origin.amount;
  const perEur = convertFromEur(1, origin.currency, rates);
  return perEur > 0 ? origin.amount / perEur : origin.amount;
}

function amountIn(origin: MoneyOrigin, currency: PartnerDisplayCurrency, rates: FxRates): number {
  if (origin.currency === currency) return origin.amount;
  return convertFromEur(exactEur(origin, rates), currency, rates);
}

/** Convert partner-currency input → EUR for DB / public listings. */
export function partnerAmountToEur(
  amount: string | number | null | undefined,
  currency: PartnerDisplayCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  rates: FxRates,
): number {
  if (amount == null || String(amount).trim() === "") return convertToEur(0, currency, rates);
  return convertToEur(exactEur(originOf(amount, currency), rates), "EUR", rates);
}

/** Convert stored EUR → partner working currency for form fields. */
export function eurToPartnerAmount(
  amountEur: string | number | null | undefined,
  currency: PartnerDisplayCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  rates: FxRates,
): string {
  const origin: MoneyOrigin = { amount: toNumber(amountEur, 0), currency: "EUR" };
  const text = formatPartnerAmount(amountIn(origin, currency, rates));
  rememberOrigin(text, currency, origin);
  return text;
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
  const origin = originOf(amount, from);
  const text = formatPartnerAmount(amountIn(origin, to, rates));
  rememberOrigin(text, to, origin);
  return text;
}
