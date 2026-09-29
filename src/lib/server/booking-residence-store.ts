import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

type Store = Record<string, string>;

function normalizeIso2(value: string) {
  const iso = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(iso) ? iso : "";
}

async function storePath() {
  return resolveDataFile("bookings", "booking-residence.json");
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Store = {};
    for (const [id, value] of Object.entries(parsed)) {
      const iso = normalizeIso2(String(value || ""));
      if (id.trim() && iso) out[id] = iso;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveBookingResidence(bookingId: string, iso2: string) {
  const id = bookingId.trim();
  const iso = normalizeIso2(iso2);
  if (!id || !iso) return;
  const store = await readStore();
  store[id] = iso;
  await ensureDataDir("bookings");
  await writeFile(await storePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function readBookingResidence(bookingId: string): Promise<string> {
  const store = await readStore();
  return store[bookingId] || "";
}
