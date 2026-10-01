import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

type StoreFile = {
  unreadIds: string[];
  /** Partner cancellations stay unread until the admin opens that booking. */
  partnerCancelledIds: string[];
};

async function unreadPath() {
  return resolveDataFile("bookings", "admin-booking-unread.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await unreadPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const ids = Array.isArray(parsed.unreadIds)
      ? parsed.unreadIds.map(String).filter(Boolean)
      : [];
    const partnerCancelledIds = Array.isArray(parsed.partnerCancelledIds)
      ? parsed.partnerCancelledIds.map(String).filter(Boolean)
      : [];
    return {
      unreadIds: [...new Set(ids)],
      partnerCancelledIds: [...new Set(partnerCancelledIds)],
    };
  } catch {
    return { unreadIds: [], partnerCancelledIds: [] };
  }
}

function combinedUnreadIds(store: StoreFile) {
  return [...new Set([...store.partnerCancelledIds, ...store.unreadIds])];
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("bookings");
  await writeFile(await unreadPath(), JSON.stringify(store, null, 2), "utf8");
}

export async function markBookingUnread(bookingId: string) {
  const id = String(bookingId || "").trim();
  if (!id) return;
  const store = await readStore();
  if (store.unreadIds.includes(id)) return;
  store.unreadIds.unshift(id);
  await writeStore(store);
}

/** Partner deleted the booking — keep it highlighted until this booking is opened. */
export async function markPartnerCancelledUnread(bookingId: string) {
  const id = String(bookingId || "").trim();
  if (!id) return;
  const store = await readStore();
  if (!store.partnerCancelledIds.includes(id)) store.partnerCancelledIds.unshift(id);
  if (!store.unreadIds.includes(id)) store.unreadIds.unshift(id);
  await writeStore(store);
}

export async function listPartnerCancelledUnreadIds(): Promise<string[]> {
  const store = await readStore();
  return [...store.partnerCancelledIds];
}

export async function markBookingRead(bookingId: string) {
  const id = String(bookingId || "").trim();
  if (!id) return;
  const store = await readStore();
  const unreadIds = store.unreadIds.filter((x) => x !== id);
  const partnerCancelledIds = store.partnerCancelledIds.filter((x) => x !== id);
  if (
    unreadIds.length === store.unreadIds.length &&
    partnerCancelledIds.length === store.partnerCancelledIds.length
  ) {
    return;
  }
  await writeStore({ unreadIds, partnerCancelledIds });
}

export async function markBookingsRead(bookingIds: string[]) {
  const remove = new Set(bookingIds.map(String).filter(Boolean));
  if (!remove.size) return;
  const store = await readStore();
  const unreadIds = store.unreadIds.filter((id) => !remove.has(id));
  const partnerCancelledIds = store.partnerCancelledIds.filter((id) => !remove.has(id));
  if (
    unreadIds.length === store.unreadIds.length &&
    partnerCancelledIds.length === store.partnerCancelledIds.length
  ) {
    return;
  }
  await writeStore({ unreadIds, partnerCancelledIds });
}

export async function markAllBookingsRead() {
  const store = await readStore();
  if (!store.unreadIds.length) return;
  const unreadIds = store.unreadIds.filter((id) => store.partnerCancelledIds.includes(id));
  if (unreadIds.length === store.unreadIds.length) return;
  await writeStore({ unreadIds, partnerCancelledIds: store.partnerCancelledIds });
}

export async function listUnreadBookingIds(): Promise<string[]> {
  const store = await readStore();
  return combinedUnreadIds(store);
}

export async function getBookingUnreadTotal(): Promise<number> {
  const store = await readStore();
  return combinedUnreadIds(store).length;
}

/** Drop ids that no longer exist in the live booking set. */
export async function pruneBookingUnread(existingIds: Iterable<string>) {
  const keep = new Set([...existingIds].map(String));
  const store = await readStore();
  const unreadIds = store.unreadIds.filter((id) => keep.has(id));
  const partnerCancelledIds = store.partnerCancelledIds.filter((id) => keep.has(id));
  if (
    unreadIds.length === store.unreadIds.length &&
    partnerCancelledIds.length === store.partnerCancelledIds.length
  ) {
    return combinedUnreadIds(store).length;
  }
  const next = { unreadIds, partnerCancelledIds };
  await writeStore(next);
  return combinedUnreadIds(next).length;
}
