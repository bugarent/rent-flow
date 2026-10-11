"use client";

import type { PartnerPricingCurrency } from "@/lib/partners/company-settings";

export type PartnerChromeSettings = {
  pricingCurrency: PartnerPricingCurrency | null;
  pendingRemoderation: boolean;
};

/** One shared fetch for top-bar currency + remodeation banner (avoids stacking /me). */
let inflight: Promise<PartnerChromeSettings> | null = null;
let cached: PartnerChromeSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export function fetchPartnerChromeSettings(force = false): Promise<PartnerChromeSettings> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_MS) {
    return Promise.resolve(cached);
  }
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer =
      ac && typeof window !== "undefined"
        ? window.setTimeout(() => ac.abort(), 8000)
        : null;
    try {
      const res = await fetch("/api/partners/company-settings", {
        cache: "no-store",
        signal: ac?.signal,
      });
      if (!res.ok) {
        return { pricingCurrency: null, pendingRemoderation: false };
      }
      const data = await res.json();
      const c = data.settings?.pricingCurrency;
      const pricingCurrency: PartnerPricingCurrency | null =
        c === "USD" || c === "EUR" || c === "GEL" ? c : null;
      const next: PartnerChromeSettings = {
        pricingCurrency,
        pendingRemoderation: Boolean(data.moderation?.pendingRemoderation),
      };
      cached = next;
      cachedAt = Date.now();
      return next;
    } catch {
      return { pricingCurrency: null, pendingRemoderation: false };
    } finally {
      if (timer != null) window.clearTimeout(timer);
      inflight = null;
    }
  })();

  return inflight;
}

export function invalidatePartnerChromeSettings() {
  cached = null;
  cachedAt = 0;
  inflight = null;
}

type Listener = (next: PartnerChromeSettings) => void;
const listeners = new Set<Listener>();

export function subscribePartnerChromeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Push fresh values from a save response so cabinet chrome updates without a reload. */
export function publishPartnerChromeSettings(patch: Partial<PartnerChromeSettings>) {
  const next: PartnerChromeSettings = {
    pricingCurrency: null,
    pendingRemoderation: false,
    ...cached,
    ...patch,
  };
  cached = next;
  cachedAt = Date.now();
  inflight = null;
  for (const listener of listeners) listener(next);
}
