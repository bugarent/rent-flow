import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

/**
 * Admin has "seen" these application ids on the moderation tab.
 * Unread = PENDING partners whose id is not in seenIds.
 */
type StoreFile = {
  seenIds: string[];
};

async function storePath() {
  return resolveDataFile("admin", "business-partner-application-seen.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile> & { unreadIds?: string[] };
    // New shape
    if (Array.isArray(parsed.seenIds)) {
      return { seenIds: [...new Set(parsed.seenIds.map(String).filter(Boolean))] };
    }
    // Legacy unreadIds file → treat as empty seen (everything pending is unread)
    return { seenIds: [] };
  } catch {
    return { seenIds: [] };
  }
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("admin");
  await writeFile(await storePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function listUnseenPendingBusinessPartnerIds(
  pendingIds: string[],
): Promise<string[]> {
  const store = await readStore();
  const seen = new Set(store.seenIds);
  return pendingIds.filter((id) => id && !seen.has(id));
}

export async function getUnseenPendingBusinessPartnerTotal(
  pendingIds: string[],
): Promise<number> {
  const unseen = await listUnseenPendingBusinessPartnerIds(pendingIds);
  return unseen.length;
}

/** Mark current pending applications as seen (admin opened moderation). */
export async function markPendingBusinessPartnerApplicationsSeen(pendingIds: string[]) {
  const ids = [...new Set(pendingIds.map((x) => String(x || "").trim()).filter(Boolean))];
  if (!ids.length) {
    // Still prune stale seen entries when nothing pending
    const store = await readStore();
    if (store.seenIds.length) await writeStore({ seenIds: [] });
    return;
  }
  const store = await readStore();
  const pending = new Set(ids);
  // Keep seen only for ids that are still pending or newly marked
  const next = new Set<string>();
  for (const id of store.seenIds) {
    if (pending.has(id)) next.add(id);
  }
  for (const id of ids) next.add(id);
  await writeStore({ seenIds: [...next] });
}

export async function markBusinessPartnerApplicationSeen(partnerId: string) {
  const id = String(partnerId || "").trim();
  if (!id) return;
  const store = await readStore();
  if (store.seenIds.includes(id)) return;
  store.seenIds.push(id);
  await writeStore(store);
}

/** Drop seen ids that are no longer pending (approved/rejected). */
export async function pruneSeenBusinessPartnerApplications(pendingIds: Set<string>) {
  const store = await readStore();
  const next = store.seenIds.filter((id) => pendingIds.has(id));
  if (next.length !== store.seenIds.length) {
    await writeStore({ seenIds: next });
  }
}
