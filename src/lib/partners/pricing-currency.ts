import type { FxRates } from "@/lib/fx";
import { isCurrency, type Currency } from "@/lib/i18n/config";
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
  const keyText = formatPartnerAmount(toNumber(text, 0));
  if (moneyOrigins.size >= MAX_MONEY_ORIGINS) moneyOrigins.clear();
  moneyOrigins.set(originKey(keyText, currency), origin);
}

/** Remember that a shown amount came from a typed figure, so a currency round-trip restores it. */
export function pinMoneyOrigin(
  shownText: string,
  shownCurrency: PartnerDisplayCurrency,
  originAmount: number,
  originCurrency: PartnerDisplayCurrency,
) {
  rememberOrigin(shownText, shownCurrency, { amount: originAmount, currency: originCurrency });
}

/**
 * The figure the partner typed, plus the EUR snapshot taken at that moment.
 * The form shows `amount` again whenever the working currency matches; rate moves do not rewrite it.
 */
export type StickyMoneyPin = {
  amount: string;
  currency: PartnerDisplayCurrency;
  priceEur: string;
  edited: boolean;
};

export function readStickyPin(raw: {
  enteredAmount?: unknown;
  enteredCurrency?: unknown;
  priceEur?: unknown;
}): StickyMoneyPin {
  const amount =
    typeof raw.enteredAmount === "string"
      ? raw.enteredAmount.trim()
      : typeof raw.enteredAmount === "number" && Number.isFinite(raw.enteredAmount)
        ? String(raw.enteredAmount)
        : "";
  const currencyRaw = typeof raw.enteredCurrency === "string" ? raw.enteredCurrency : "";
  const hasEntered = amount !== "" && isCurrency(currencyRaw);
  const priceRaw = raw.priceEur;
  const priceEur =
    priceRaw == null || priceRaw === ""
      ? ""
      : typeof priceRaw === "number" || typeof priceRaw === "string"
        ? String(priceRaw)
        : "";
  return {
    amount: hasEntered ? amount : "",
    currency: hasEntered && isCurrency(currencyRaw) ? currencyRaw : "EUR",
    priceEur,
    edited: false,
  };
}

/** Show the typed amount when the currency matches. Otherwise derive the other currency from that typed amount. */
export function displayStickyMoney(
  pin: Pick<StickyMoneyPin, "amount" | "currency" | "priceEur">,
  currency: PartnerDisplayCurrency,
  rates: FxRates,
): string {
  const amount = pin.amount.trim();
  const originAmount = toNumber(amount, Number.NaN);
  if (amount && Number.isFinite(originAmount) && isCurrency(pin.currency)) {
    if (pin.currency === currency) {
      pinMoneyOrigin(amount, currency, originAmount, pin.currency);
      return amount;
    }
    return rebasePartnerAmount(amount, pin.currency, currency, rates);
  }
  if (pin.priceEur === "") return "";
  return eurToPartnerAmount(pin.priceEur, currency, rates);
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
