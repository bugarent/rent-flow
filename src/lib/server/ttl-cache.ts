/** Tiny in-memory TTL cache for JSON/file-backed public reads. */
export function createTtlCache<T>(ttlMs: number) {
  let entry: { at: number; value: T } | null = null;

  return {
    get(): T | null {
      if (!entry) return null;
      if (Date.now() - entry.at >= ttlMs) {
        return null;
      }
      return entry.value;
    },
    /** Last successful value, including after the TTL, so a slow read cannot blank the page. */
    peek(): T | null {
      return entry?.value ?? null;
    },
    set(value: T) {
      entry = { at: Date.now(), value };
    },
    clear() {
      entry = null;
    },
  };
}
