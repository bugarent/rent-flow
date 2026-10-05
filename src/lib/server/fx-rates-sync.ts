import "server-only";

import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { savePlatformSettings } from "@/lib/server/platform-settings-store";
import { toNumber } from "@/lib/utils";

export type FxSyncResult = {
  ok: boolean;
  rates: FxRates;
  source: "frankfurter" | "exchangerate-api" | "open-er-api" | "nbg" | "fallback";
  updatedAt: string;
  error?: string;
};

function positive(n: unknown, fallback: number): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function ratesFromMap(
  map: Record<string, number> | undefined,
  source: FxSyncResult["source"],
): { rates: FxRates; source: FxSyncResult["source"] } | null {
  if (!map) return null;
  const eurUsd = Number(map.USD);
  const eurGbp = Number(map.GBP);
  const eurGel = Number(map.GEL);
  const eurRub = Number(map.RUB);
  if (!(eurUsd > 0) || !(eurGbp > 0) || !(eurGel > 0)) return null;
  return {
    source,
    rates: {
      eurUsd,
      eurGbp,
      eurGel,
      eurRub: eurRub > 0 ? eurRub : DEFAULT_FX_RATES.eurRub,
    },
  };
}

async function fetchExchangeRateApi(apiKey: string) {
  const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/EUR`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`exchangerate-api HTTP ${res.status}`);
  const data = (await res.json()) as {
    result?: string;
    conversion_rates?: Record<string, number>;
  };
  if (data.result !== "success") throw new Error("exchangerate-api bad payload");
  const parsed = ratesFromMap(data.conversion_rates, "exchangerate-api");
  if (!parsed) throw new Error("exchangerate-api missing GEL");
  return parsed;
}

/** Free EUR-base feed that includes GEL, USD, GBP, and RUB. */
async function fetchOpenErApi() {
  const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  if (data.result !== "success") throw new Error("open.er-api bad payload");
  const parsed = ratesFromMap(data.rates, "open-er-api");
  if (!parsed) throw new Error("open.er-api missing GEL");
  return parsed;
}

/**
 * National Bank of Georgia: GEL per `quantity` units of each currency.
 * Cross into EUR-base: USD per 1 EUR = (GEL per EUR) / (GEL per USD).
 */
async function fetchNbg() {
  const res = await fetch("https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`nbg HTTP ${res.status}`);
  const data = (await res.json()) as Array<{
    currencies?: Array<{ code?: string; quantity?: number; rate?: number }>;
  }>;
  const list = data?.[0]?.currencies || [];
  const gelPer = (code: string) => {
    const row = list.find((item) => item.code === code);
    const rate = Number(row?.rate);
    const quantity = Number(row?.quantity) || 1;
    if (!(rate > 0) || !(quantity > 0)) return 0;
    return rate / quantity;
  };
  const gelPerEur = gelPer("EUR");
  const gelPerUsd = gelPer("USD");
  const gelPerGbp = gelPer("GBP");
  const gelPerRub = gelPer("RUB");
  if (!(gelPerEur > 0) || !(gelPerUsd > 0) || !(gelPerGbp > 0)) {
    throw new Error("nbg missing EUR/USD/GBP");
  }
  return {
    source: "nbg" as const,
    rates: {
      eurUsd: gelPerEur / gelPerUsd,
      eurGbp: gelPerEur / gelPerGbp,
      eurGel: gelPerEur,
      eurRub: gelPerRub > 0 ? gelPerEur / gelPerRub : DEFAULT_FX_RATES.eurRub,
    },
  };
}

async function fetchFrankfurter() {
  const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  if (!data.rates?.USD || !data.rates?.GBP) throw new Error("frankfurter bad payload");
  return {
    source: "frankfurter" as const,
    rates: {
      eurUsd: positive(data.rates.USD, DEFAULT_FX_RATES.eurUsd),
      eurGbp: positive(data.rates.GBP, DEFAULT_FX_RATES.eurGbp),
      eurGel: DEFAULT_FX_RATES.eurGel,
      eurRub: DEFAULT_FX_RATES.eurRub,
    },
  };
}

/**
 * Fetch EUR→currency mid-market rates, including GEL.
 * Order: optional exchangerate-api key, open.er-api, National Bank of Georgia, Frankfurter (USD/GBP only).
 */
export async function fetchLiveFxRates(): Promise<{ rates: FxRates; source: FxSyncResult["source"] }> {
  const errors: string[] = [];
  const apiKey = String(process.env.EXCHANGE_RATE_API_KEY || "").trim();
  if (apiKey) {
    try {
      return await fetchExchangeRateApi(apiKey);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "exchangerate-api failed");
    }
  }
  try {
    return await Promise.any([fetchOpenErApi(), fetchNbg()]);
  } catch (error) {
    const aggregate = error as { errors?: unknown[] };
    for (const item of aggregate.errors || [error]) {
      errors.push(item instanceof Error ? item.message : "fx source failed");
    }
  }
  try {
    return await fetchFrankfurter();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "frankfurter failed");
  }
  throw new Error(errors.join("; ") || "fx unavailable");
}

/** Pull live rates and persist into platform settings (DB + file store). */
export async function syncFxRatesToPlatform(): Promise<FxSyncResult> {
  const updatedAt = new Date().toISOString();
  try {
    const { rates, source } = await fetchLiveFxRates();
    const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
    const current = await getPlatformSettings();
    const merged: FxRates = {
      eurUsd: rates.eurUsd,
      eurGbp: rates.eurGbp,
      eurGel: source === "frankfurter" ? positive(current.eurGelRate, rates.eurGel) : rates.eurGel,
      eurRub: source === "frankfurter" ? positive(current.eurRubRate, rates.eurRub) : rates.eurRub,
    };
    await savePlatformSettings({
      eurUsdRate: merged.eurUsd,
      eurGbpRate: merged.eurGbp,
      eurGelRate: merged.eurGel,
      eurRubRate: merged.eurRub,
      fxRatesUpdatedAt: updatedAt,
    });
    return { ok: true, rates: merged, source, updatedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FX sync failed";
    console.error("[fx-rates-sync]", message);
    return {
      ok: false,
      rates: DEFAULT_FX_RATES,
      source: "fallback",
      updatedAt,
      error: message,
    };
  }
}

function tbilisiDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function readStoredFxRates(): Promise<FxRates> {
  const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
  const settings = await getPlatformSettings();
  return {
    eurUsd: toNumber(settings.eurUsdRate, DEFAULT_FX_RATES.eurUsd),
    eurGbp: toNumber(settings.eurGbpRate, DEFAULT_FX_RATES.eurGbp),
    eurGel: toNumber(settings.eurGelRate, DEFAULT_FX_RATES.eurGel),
    eurRub: toNumber(settings.eurRubRate, DEFAULT_FX_RATES.eurRub),
  };
}

let dailySync: Promise<FxRates> | null = null;

/** Refresh platform rates once per Tbilisi calendar day, then return the stored rates. */
export async function ensureDailyFxRates(): Promise<FxRates> {
  const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
  const current = await getPlatformSettings();
  const savedAt = current.fxRatesUpdatedAt ? new Date(current.fxRatesUpdatedAt) : null;
  const fresh =
    savedAt != null &&
    !Number.isNaN(savedAt.getTime()) &&
    tbilisiDay(savedAt) === tbilisiDay(new Date()) &&
    current.eurUsdRate > 0 &&
    current.eurGelRate > 0;
  if (fresh) return readStoredFxRates();
  if (!dailySync) {
    dailySync = (async () => {
      const result = await syncFxRatesToPlatform();
      if (result.ok) return result.rates;
      return readStoredFxRates();
    })().finally(() => {
      dailySync = null;
    });
  }
  return dailySync;
}
