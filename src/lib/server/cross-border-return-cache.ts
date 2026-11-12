import { createTtlCache } from "@/lib/server/ttl-cache";
import type { CrossBorderReturnMap } from "@/lib/catalog/cross-border-returns";

/** Short memory copy. Delivery and listing saves clear the search catalog, which drops this too. */
export const crossBorderReturnCache = createTtlCache<CrossBorderReturnMap>(15_000);
