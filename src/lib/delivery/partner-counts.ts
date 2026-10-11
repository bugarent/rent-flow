import { normalizeLocationCode } from "@/lib/catalog/search-places";

/** Partner deliveries for a place, matched by id, IATA, or city code. */
export function lookupDeliveryCount(
  counts: Record<string, number>,
  keys: Array<string | null | undefined>,
): number {
  for (const key of keys) {
    const norm = normalizeLocationCode(String(key || "")).toUpperCase();
    if (norm && counts[norm]) return counts[norm];
  }
  return 0;
}
