"use client";

import { useEffect, useState } from "react";
import type { SearchAirportOption } from "@/components/search/airport-search";

/** First try waits a little: the streamed homepage hero usually brings the list before that. */
const RETRY_DELAYS_MS = [1500, 3000, 6000, 10000];

/**
 * Server-rendered pickup places, or — when the page arrived without them because the first
 * database read was slow — the same list loaded from the browser. Without it the country and
 * place pickers render empty.
 */
export function useSearchOptions(serverOptions: SearchAirportOption[]): SearchAirportOption[] {
  const [loaded, setLoaded] = useState<SearchAirportOption[] | null>(null);
  const needsLoad = serverOptions.length === 0;

  useEffect(() => {
    if (!needsLoad) return;
    let cancelled = false;
    let timer: number | undefined;
    const attempt = (index: number) => {
      timer = window.setTimeout(async () => {
        try {
          const res = await fetch("/api/search-places", { cache: "no-store" });
          const data = (await res.json().catch(() => [])) as unknown;
          if (!cancelled && res.ok && Array.isArray(data) && data.length) {
            setLoaded(data as SearchAirportOption[]);
            return;
          }
        } catch {
          /* retry below */
        }
        if (!cancelled && index + 1 < RETRY_DELAYS_MS.length) attempt(index + 1);
      }, RETRY_DELAYS_MS[index]);
    };
    attempt(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [needsLoad]);

  return needsLoad ? loaded ?? serverOptions : serverOptions;
}
