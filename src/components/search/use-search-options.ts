"use client";

import { useEffect, useState } from "react";
import type { SearchAirportOption } from "@/components/search/airport-search";

const STORAGE_KEY = "rac_search_places_v1";
const RETRY_DELAYS_MS = [0, 1500, 4000, 8000];

/** One request per page load, shared by the hero placeholder and the hero that replaces it. */
let pending: Promise<SearchAirportOption[]> | null = null;

function readStored(): SearchAirportOption[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as SearchAirportOption[]) : [];
  } catch {
    return [];
  }
}

function store(list: SearchAirportOption[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* private mode / quota */
  }
}

async function fetchWithRetry(): Promise<SearchAirportOption[]> {
  for (const wait of RETRY_DELAYS_MS) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      const res = await fetch("/api/search-places", { cache: "no-store" });
      const data = (await res.json().catch(() => [])) as unknown;
      if (res.ok && Array.isArray(data) && data.length) {
        store(data as SearchAirportOption[]);
        return data as SearchAirportOption[];
      }
    } catch {
      /* retry */
    }
  }
  pending = null;
  return [];
}

/**
 * Server-rendered pickup places, or — when the page arrived without them because the first
 * database read was slow — the last list this browser saw, refreshed from the server at once.
 * Without it the country and place pickers render empty.
 */
export function useSearchOptions(serverOptions: SearchAirportOption[]): SearchAirportOption[] {
  const [loaded, setLoaded] = useState<SearchAirportOption[] | null>(null);
  const needsLoad = serverOptions.length === 0;

  useEffect(() => {
    if (!needsLoad) {
      store(serverOptions);
      return;
    }
    let cancelled = false;
    const stored = readStored();
    if (stored.length) setLoaded(stored);
    pending ??= fetchWithRetry();
    void pending.then((list) => {
      if (!cancelled && list.length) setLoaded(list);
    });
    return () => {
      cancelled = true;
    };
  }, [needsLoad, serverOptions]);

  return needsLoad ? loaded ?? serverOptions : serverOptions;
}
