import "server-only";

import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { savePlatformSettings } from "@/lib/server/platform-settings-store";

export type FxSyncResult = {
  ok: boolean;
  rates: FxRates;
  source: "frankfurter" | "exchangerate-api" | "fallback";
  updatedAt: string;
  error?: string;
};

function positive(n: unknown, fallback: number): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Fetch EUR→currency mid-market rates.
 * Prefer Frankfurter (ECB, free, no key). Optional EXCHANGE_RATE_API_KEY for exchangerate-api.com.
 */
export async function fetchLiveFxRates(): Promise<{ rates: FxRates; source: FxSyncResult["source"] }> {
  const apiKey = String(process.env.EXCHANGE_RATE_API_KEY || "").trim();
  if (apiKey) {
    const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/EUR`;
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`exchangerate-api HTTP ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      conversion_rates?: Record<string, number>;
    };
    if (data.result !== "success" || !data.conversion_rates) {
      throw new Error("exchangerate-api bad payload");
    }
    const r = data.conversion_rates;
    return {
      source: "exchangerate-api",
      rates: {
        eurUsd: positive(r.USD, DEFAULT_FX_RATES.eurUsd),
        eurGbp: positive(r.GBP, DEFAULT_FX_RATES.eurGbp),
        eurGel: positive(r.GEL, DEFAULT_FX_RATES.eurGel),
        eurRub: positive(r.RUB, DEFAULT_FX_RATES.eurRub),
      },
    };
  }

  // Frankfurter.app — ECB reference rates, EUR base, no API key
  const url =
    "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP";
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  if (!data.rates) throw new Error("frankfurter bad payload");

  // GEL/RUB not on ECB — keep last known / env defaults for those legs
  return {
    source: "frankfurter",
    rates: {
      eurUsd: positive(data.rates.USD, DEFAULT_FX_RATES.eurUsd),
      eurGbp: positive(data.rates.GBP, DEFAULT_FX_RATES.eurGbp),
      eurGel: DEFAULT_FX_RATES.eurGel,
      eurRub: DEFAULT_FX_RATES.eurRub,
    },
  };
}

/** Pull live rates and persist into platform settings (DB + file store). */
export async function syncFxRatesToPlatform(): Promise<FxSyncResult> {
  const updatedAt = new Date().toISOString();
  try {
    const { rates, source } = await fetchLiveFxRates();
    // Merge GEL/RUB from prior settings when Frankfurter cannot supply them
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
