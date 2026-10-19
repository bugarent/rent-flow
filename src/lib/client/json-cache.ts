"use client";

type Entry = { at: number; promise: Promise<unknown> };

const entries = new Map<string, Entry>();

/**
 * GET JSON once per `ttlMs` per tab, shared by every caller (stale entries are
 * fetched again). Failed requests are not kept, so the next call retries.
 */
export function fetchJsonCached<T>(url: string, ttlMs: number): Promise<T> {
  const hit = entries.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise as Promise<T>;
  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
  entries.set(url, { at: Date.now(), promise });
  promise.catch(() => {
    if (entries.get(url)?.promise === promise) entries.delete(url);
  });
  return promise as Promise<T>;
}

/** Warm the cache in the background; errors are ignored. */
export function prefetchJson(url: string, ttlMs: number) {
  void fetchJsonCached(url, ttlMs).catch(() => undefined);
}
