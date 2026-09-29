import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { parsePartnerMessengers, type PartnerSocialPlatform } from "@/lib/partner";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

type Store = Record<string, PartnerSocialPlatform[]>;

async function storePath() {
  return resolveDataFile("bookings", "booking-messengers.json");
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Store = {};
    for (const [id, value] of Object.entries(parsed)) {
      const messengers = parsePartnerMessengers(value);
      if (messengers.length) out[id] = messengers;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveBookingMessengers(bookingId: string, messengers: PartnerSocialPlatform[]) {
  const id = bookingId.trim();
  const next = parsePartnerMessengers(messengers);
  if (!id || !next.length) return;
  const store = await readStore();
  store[id] = next;
  await ensureDataDir("bookings");
  await writeFile(await storePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function readBookingMessengers(bookingId: string): Promise<PartnerSocialPlatform[]> {
  const store = await readStore();
  return store[bookingId] || [];
}

export async function readAllBookingMessengers(): Promise<Store> {
  return readStore();
}
