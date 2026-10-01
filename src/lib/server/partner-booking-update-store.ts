import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "partner-booking-updates.json");

type StoreFile = { updatedIds: string[] };

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const ids = Array.isArray(parsed.updatedIds)
      ? parsed.updatedIds.map(String).filter(Boolean)
      : [];
    return { updatedIds: [...new Set(ids)] };
  } catch {
    return { updatedIds: [] };
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

/** Mark a booking as corrected — partner calendar bar blinks until opened. */
export async function markPartnerBookingUpdated(bookingId: string) {
  const id = String(bookingId || "").trim();
  if (!id) return;
  const store = await readStore();
  if (store.updatedIds.includes(id)) return;
  store.updatedIds.unshift(id);
  await writeStore(store);
}

export async function markPartnerBookingUpdateRead(bookingId: string) {
  const id = String(bookingId || "").trim();
  if (!id) return;
  const store = await readStore();
  const next = store.updatedIds.filter((x) => x !== id);
  if (next.length === store.updatedIds.length) return;
  await writeStore({ updatedIds: next });
}

export async function listPartnerUpdatedBookingIds(): Promise<string[]> {
  const store = await readStore();
  return [...store.updatedIds];
}

export async function isPartnerBookingUpdated(bookingId: string): Promise<boolean> {
  const id = String(bookingId || "").trim();
  if (!id) return false;
  const store = await readStore();
  return store.updatedIds.includes(id);
}

export async function prunePartnerBookingUpdates(existingIds: Iterable<string>) {
  const keep = new Set([...existingIds].map(String));
  const store = await readStore();
  const next = store.updatedIds.filter((id) => keep.has(id));
  if (next.length === store.updatedIds.length) return next;
  await writeStore({ updatedIds: next });
  return next;
}
