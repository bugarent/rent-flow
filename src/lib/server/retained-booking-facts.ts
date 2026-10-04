import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import type { AdminBookingFact } from "@/lib/server/admin-booking-facts";

/**
 * Permanent copy of a booking for finance and statistics.
 * Deleting a booking from the list removes the live reservation only.
 */
type StoreFile = { facts: AdminBookingFact[] };

async function factsPath() {
  return resolveDataFile("bookings", "retained-booking-facts.json");
}

function isFact(value: unknown): value is AdminBookingFact {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<AdminBookingFact>;
  return typeof row.id === "string" && row.id.length > 0 && typeof row.createdAt === "string";
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await factsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const facts = Array.isArray(parsed.facts) ? parsed.facts.filter(isFact) : [];
    return { facts };
  } catch {
    return { facts: [] };
  }
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("bookings");
  await writeFile(await factsPath(), JSON.stringify(store, null, 2), "utf8");
}

export async function listRetainedBookingFacts(): Promise<AdminBookingFact[]> {
  const store = await readStore();
  return store.facts;
}

/** Admin period cleanup: drop finance copies by id. Returns how many were removed. */
export async function deleteRetainedBookingFacts(ids: readonly string[]): Promise<number> {
  if (!ids.length) return 0;
  const drop = new Set(ids);
  const store = await readStore();
  const before = store.facts.length;
  store.facts = store.facts.filter((row) => !drop.has(row.id));
  const removed = before - store.facts.length;
  if (removed) await writeStore(store);
  return removed;
}

/** Insert or replace. Existing retained rows are kept unless the admin deletes them. */
export async function saveRetainedBookingFact(fact: AdminBookingFact): Promise<void> {
  const store = await readStore();
  const idx = store.facts.findIndex((row) => row.id === fact.id);
  if (idx >= 0) store.facts[idx] = fact;
  else store.facts.push(fact);
  await writeStore(store);
}
