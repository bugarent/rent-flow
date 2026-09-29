import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "@/lib/i18n/config";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFx(
  rates: FxRates | number = DEFAULT_FX_RATES,
  eurGbpRate = DEFAULT_FX_RATES.eurGbp,
  eurGelRate = DEFAULT_FX_RATES.eurGel,
  eurRubRate = DEFAULT_FX_RATES.eurRub,
): FxRates {
  return typeof rates === "number"
    ? { eurUsd: rates, eurGbp: eurGbpRate, eurGel: eurGelRate, eurRub: eurRubRate }
    : {
        eurUsd: rates.eurUsd,
        eurGbp: rates.eurGbp,
        eurGel: rates.eurGel,
        eurRub: rates.eurRub ?? eurRubRate,
      };
}

/** Round to cents so FX conversion does not leave repeating floats. */
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/** Display number after conversion: `41` or `20.30`, never `46.296296…`. */
export function formatAmountNumber(amount: number): string {
  const rounded = roundMoney(amount);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Convert an amount stored in EUR into the visitor/partner display currency. */
export function convertFromEur(
  amountEur: number,
  currency: Currency,
  rates: FxRates | number = DEFAULT_FX_RATES,
  eurGbpRate = DEFAULT_FX_RATES.eurGbp,
  eurGelRate = DEFAULT_FX_RATES.eurGel,
  eurRubRate = DEFAULT_FX_RATES.eurRub,
): number {
  const fx = normalizeFx(rates, eurGbpRate, eurGelRate, eurRubRate);
  if (!Number.isFinite(amountEur)) return 0;
  if (currency === "USD") {
    return fx.eurUsd > 0 ? amountEur * fx.eurUsd : amountEur;
  }
  if (currency === "GBP") {
    return fx.eurGbp > 0 ? amountEur * fx.eurGbp : amountEur;
  }
  if (currency === "GEL") {
    return fx.eurGel > 0 ? amountEur * fx.eurGel : amountEur;
  }
  return amountEur;
}

/** Convert an amount entered in `currency` into EUR for storage. */
export function convertToEur(
  amount: number,
  currency: Currency,
  rates: FxRates | number = DEFAULT_FX_RATES,
  eurGbpRate = DEFAULT_FX_RATES.eurGbp,
  eurGelRate = DEFAULT_FX_RATES.eurGel,
  eurRubRate = DEFAULT_FX_RATES.eurRub,
): number {
  const fx = normalizeFx(rates, eurGbpRate, eurGelRate, eurRubRate);
  if (currency === "USD") return fx.eurUsd > 0 ? roundMoney(amount / fx.eurUsd) : roundMoney(amount);
  if (currency === "GBP") return fx.eurGbp > 0 ? roundMoney(amount / fx.eurGbp) : roundMoney(amount);
  if (currency === "GEL") return fx.eurGel > 0 ? roundMoney(amount / fx.eurGel) : roundMoney(amount);
  return roundMoney(amount);
}

/** Convert between any supported currencies via the EUR hub. */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: FxRates | number = DEFAULT_FX_RATES,
): number {
  if (from === to) return roundMoney(amount);
  const asEur = convertToEur(amount, from, rates);
  return roundMoney(convertFromEur(asEur, to, rates));
}

export function currencySymbol(currency: Currency): string {
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  if (currency === "GEL") return "₾";
  return "€";
}

/** Format an already-converted amount with its currency sign: `41$`, `20.30€`. */
export function formatMoneyAmount(amount: number, currency: Currency): string {
  return `${formatAmountNumber(amount)}${currencySymbol(currency)}`;
}

export function formatMoney(
  amountEur: number,
  currency: Currency,
  rates: FxRates | number = DEFAULT_FX_RATES,
  eurGbpRate = DEFAULT_FX_RATES.eurGbp,
  eurGelRate = DEFAULT_FX_RATES.eurGel,
  eurRubRate = DEFAULT_FX_RATES.eurRub,
) {
  const amount = convertFromEur(amountEur, currency, rates, eurGbpRate, eurGelRate, eurRubRate);
  return formatMoneyAmount(amount, currency);
}

export function displayPrice(
  amountEur: number,
  currency: Currency,
  rates: FxRates | number = DEFAULT_FX_RATES,
  eurGbpRate = DEFAULT_FX_RATES.eurGbp,
  eurGelRate = DEFAULT_FX_RATES.eurGel,
  eurRubRate = DEFAULT_FX_RATES.eurRub,
) {
  if (amountEur === 0) return "Free";
  return formatMoney(amountEur, currency, rates, eurGbpRate, eurGelRate, eurRubRate);
}

export function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
