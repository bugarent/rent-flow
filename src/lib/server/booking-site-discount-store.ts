import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import { createTtlCache } from "@/lib/server/ttl-cache";

/** bookingId → site discount percent the booking was charged with (only when > 0). */
type Store = Record<string, number>;

const cache = createTtlCache<Store>(5_000);

async function storePath() {
  return resolveDataFile("bookings", "booking-site-discount.json");
}

async function readStore(): Promise<Store> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Store = {};
    for (const [id, value] of Object.entries(parsed)) {
      const pct = Math.trunc(Number(value) || 0);
      if (id.trim() && pct > 0) out[id] = pct;
    }
    cache.set(out);
    return out;
  } catch {
    return {};
  }
}

export async function saveBookingSiteDiscount(bookingId: string, percent: number) {
  const id = bookingId.trim();
  const pct = Math.trunc(Number(percent) || 0);
  if (!id || pct <= 0) return;
  const store = { ...(await readStore()), [id]: pct };
  await ensureDataDir("bookings");
  await writeFile(await storePath(), JSON.stringify(store, null, 2), "utf8");
  cache.set(store);
}

export async function readBookingSiteDiscount(bookingId: string | null | undefined): Promise<number> {
  const id = String(bookingId || "").trim();
  if (!id) return 0;
  try {
    return (await readStore())[id] || 0;
  } catch {
    return 0;
  }
}
