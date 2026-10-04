import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

/** Bookings whose finances the admin deleted while the booking itself stays in the list. */
type StoreFile = { ids: string[] };

async function storePath() {
  return resolveDataFile("bookings", "finance-excluded-bookings.json");
}

export async function listFinanceExcludedIds(): Promise<Set<string>> {
  try {
    const parsed = JSON.parse(await readFile(await storePath(), "utf8")) as Partial<StoreFile>;
    return new Set(Array.isArray(parsed.ids) ? parsed.ids.map(String) : []);
  } catch {
    return new Set();
  }
}

async function writeIds(ids: Set<string>) {
  await ensureDataDir("bookings");
  await writeFile(await storePath(), JSON.stringify({ ids: [...ids] }, null, 2), "utf8");
}

export async function addFinanceExcludedIds(ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const current = await listFinanceExcludedIds();
  for (const id of ids) current.add(id);
  await writeIds(current);
}

export async function removeFinanceExcludedIds(ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const current = await listFinanceExcludedIds();
  let changed = false;
  for (const id of ids) changed = current.delete(id) || changed;
  if (changed) await writeIds(current);
}
