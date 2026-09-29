import { cookies } from "next/headers";
import {
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isCurrency,
  isLocale,
  type Currency,
  type Locale,
} from "@/lib/i18n/config";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { toNumber } from "@/lib/utils";

export async function readPreferences(): Promise<{ locale: Locale; currency: Currency }> {
  const jar = await cookies();
  const localeRaw = jar.get(LOCALE_COOKIE)?.value;
  const currencyRaw = jar.get(CURRENCY_COOKIE)?.value;
  return {
    locale: isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE,
    currency: isCurrency(currencyRaw) ? currencyRaw : DEFAULT_CURRENCY,
  };
}

export function defaultEurUsdRate() {
  const fromEnv = Number(process.env.EUR_USD_RATE);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_FX_RATES.eurUsd;
}

export function defaultFxRates(): FxRates {
  return {
    eurUsd: defaultEurUsdRate(),
    eurGbp: (() => {
      const n = Number(process.env.EUR_GBP_RATE);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_FX_RATES.eurGbp;
    })(),
    eurGel: (() => {
      const n = Number(process.env.EUR_GEL_RATE);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_FX_RATES.eurGel;
    })(),
    eurRub: (() => {
      const n = Number(process.env.EUR_RUB_RATE);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_FX_RATES.eurRub;
    })(),
  };
}

/** Load EUR→currency rates from platform settings (with safe fallbacks). */
export async function getFxRates(): Promise<FxRates> {
  const fallback = defaultFxRates();
  try {
    const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
    const settings = await getPlatformSettings();
    return {
      eurUsd: toNumber(settings.eurUsdRate, fallback.eurUsd),
      eurGbp: toNumber(settings.eurGbpRate, fallback.eurGbp),
      eurGel: toNumber(settings.eurGelRate, fallback.eurGel),
      eurRub: toNumber(settings.eurRubRate, fallback.eurRub),
    };
  } catch {
    return fallback;
  }
}
