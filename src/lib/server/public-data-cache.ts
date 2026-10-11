import "server-only";

import { unstable_cache } from "next/cache";

/** Shared tag for public page data; invalidated by `revalidatePublishedContent()`. */
export const PUBLIC_CONTENT_TAG = "public-content";

class UncacheableResult<T> {
  constructor(readonly value: T) {}
}

/**
 * Persist a public read in the Next data cache so a fresh server instance does not
 * re-query the database on every page view. Results rejected by `keep` (e.g. an empty
 * list after a DB hiccup) are returned but never stored.
 */
export function cachedPublicRead<T>(
  key: string,
  read: () => Promise<T>,
  opts: { revalidate?: number; keep?: (value: T) => boolean } = {},
): () => Promise<T> {
  const cached = unstable_cache(
    async () => {
      const value = await read();
      if (opts.keep && !opts.keep(value)) throw new UncacheableResult(value);
      return value;
    },
    ["public-read", key],
    { tags: [PUBLIC_CONTENT_TAG], revalidate: opts.revalidate ?? 300 },
  );
  return async () => {
    try {
      return await cached();
    } catch (error) {
      if (error instanceof UncacheableResult) return error.value as T;
      return read();
    }
  };
}
