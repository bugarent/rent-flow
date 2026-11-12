import "server-only";

import { unstable_cache } from "next/cache";

/** Shared tag for public page data; invalidated by `revalidatePublishedContent()`. */
export const PUBLIC_CONTENT_TAG = "public-content";

class UncacheableResult<T> {
  constructor(readonly value: T) {}
}

export type CachedPublicRead<T> = (() => Promise<T>) & {
  /** Last value this server instance read successfully (undefined before the first one). */
  peek: () => T | undefined;
};

/**
 * Persist a public read in the Next data cache so a fresh server instance does not
 * re-query the database on every page view. Results rejected by `keep` (e.g. an empty
 * list after a DB hiccup) are never stored; the instance's last good value is served instead.
 */
export function cachedPublicRead<T>(
  key: string,
  read: () => Promise<T>,
  opts: { revalidate?: number; keep?: (value: T) => boolean } = {},
): CachedPublicRead<T> {
  let lastGood: T | undefined;
  const good = (value: T) => !opts.keep || opts.keep(value);
  const cached = unstable_cache(
    async () => {
      const value = await read();
      if (!good(value)) throw new UncacheableResult(value);
      return value;
    },
    ["public-read", key],
    { tags: [PUBLIC_CONTENT_TAG], revalidate: opts.revalidate ?? 300 },
  );
  const run = async () => {
    try {
      const value = await cached();
      lastGood = value;
      return value;
    } catch (error) {
      if (error instanceof UncacheableResult) return lastGood ?? (error.value as T);
      if (lastGood !== undefined) return lastGood;
      const value = await read();
      if (good(value)) lastGood = value;
      return value;
    }
  };
  return Object.assign(run, { peek: () => lastGood });
}
