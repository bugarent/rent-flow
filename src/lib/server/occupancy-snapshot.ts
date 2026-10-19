import "server-only";

import { computeBufferEndsAt } from "@/lib/calendar/buffer";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";

/**
 * Everything that makes a car unavailable, loaded once and checked in memory so a
 * search for any date range costs no database round trip. Same rules as the
 * per-source functions in car-availability / car-calendar-blocks-store / channel-sync.
 */
type Interval = { carId: string; start: number; end: number };

type Snapshot = {
  at: number;
  /** Bookings ending before this were not loaded; older ranges use the direct queries. */
  floor: number;
  /** Site + file bookings: occupied [pickupAt, bufferEndsAt). Compared against the buffered search end. */
  bookings: Interval[];
  /** Calendar blocks: [from, to + buffer). Compared against the raw search end. */
  blocks: Interval[];
  /** iCal feeds + partner API blocks: [start, end + buffer). Compared against the buffered search end. */
  channels: Interval[];
};

const TTL_MS = 20_000;
const FLOOR_MS = 24 * 60 * 60 * 1000;

let snapshot: Snapshot | null = null;
let loading: Promise<Snapshot> | null = null;

function ms(value: string | Date | null | undefined) {
  const t = value instanceof Date ? value.getTime() : new Date(String(value ?? "")).getTime();
  return Number.isFinite(t) ? t : NaN;
}

async function load(): Promise<Snapshot> {
  const now = Date.now();
  const floor = now - FLOOR_MS;
  const bookings: Interval[] = [];
  const blocks: Interval[] = [];
  const channels: Interval[] = [];

  const [dbRows, fileRows, blockRows, feeds, apiBlocks] = await Promise.all([
    prisma.booking
      .findMany({
        where: { status: { in: ["PENDING", "CONFIRMED"] }, bufferEndsAt: { gt: new Date(floor) } },
        select: { carId: true, pickupAt: true, bufferEndsAt: true },
      })
      .catch((error: unknown) => {
        if (isDbOfflineError(error)) return [];
        throw error;
      }),
    import("@/lib/server/customer-bookings-store").then((m) => m.listAllFileBookings()).catch(() => []),
    import("@/lib/server/car-calendar-blocks-store").then((m) => m.listAllCalendarBlocks()).catch(() => []),
    import("@/lib/server/channel-feeds-store").then((m) => m.listChannelFeeds()).catch(() => []),
    import("@/lib/server/channel-sync").then((m) => m.apiAvailabilityBlocks()).catch(() => []),
  ]);

  for (const row of dbRows) {
    if (row.carId) bookings.push({ carId: row.carId, start: row.pickupAt.getTime(), end: row.bufferEndsAt.getTime() });
  }
  for (const b of fileRows) {
    if (b.status !== "PENDING" && b.status !== "CONFIRMED") continue;
    if (!b.carId) continue;
    const start = ms(b.pickupAt);
    const end = ms(b.bufferEndsAt || computeBufferEndsAt(new Date(b.dropoffAt)));
    if (Number.isFinite(start) && Number.isFinite(end)) bookings.push({ carId: b.carId, start, end });
  }
  for (const b of blockRows) {
    const start = ms(b.from);
    const end = ms(computeBufferEndsAt(new Date(b.to)));
    if (Number.isFinite(start) && Number.isFinite(end)) blocks.push({ carId: b.carId, start, end });
  }
  for (const feed of feeds) {
    for (const event of feed.busy || []) {
      const start = ms(event.start);
      const end = ms(computeBufferEndsAt(new Date(event.end)));
      // NaN never overlaps, matching Date comparisons in rangesOverlap.
      channels.push({ carId: feed.carId, start, end });
    }
  }
  for (const block of apiBlocks) {
    const start = ms(block.start);
    const end = ms(computeBufferEndsAt(new Date(block.end)));
    if (Number.isFinite(start) && Number.isFinite(end)) channels.push({ carId: block.carId, start, end });
  }
  return { at: now, floor, bookings, blocks, channels };
}

async function current(): Promise<Snapshot> {
  if (snapshot && Date.now() - snapshot.at < TTL_MS) return snapshot;
  if (!loading) {
    loading = load()
      .then((next) => {
        snapshot = next;
        return next;
      })
      .finally(() => {
        loading = null;
      });
  }
  // A recent copy answers right away while the refresh runs.
  if (snapshot) return snapshot;
  return loading;
}

/** Car ids that cannot be rented for [rangeStart, rangeEnd]; null when the range predates the snapshot. */
export async function unavailableCarIdsFromSnapshot(rangeStart: Date, rangeEnd: Date): Promise<Set<string> | null> {
  const from = rangeStart.getTime();
  const to = rangeEnd.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return new Set();
  const snap = await current();
  if (from <= snap.floor) return null;
  const occupiedUntil = computeBufferEndsAt(rangeEnd).getTime();
  const ids = new Set<string>();
  for (const b of snap.bookings) if (b.start < occupiedUntil && b.end > from) ids.add(b.carId);
  for (const b of snap.blocks) if (b.start < to && b.end > from) ids.add(b.carId);
  for (const b of snap.channels) if (from < b.end && b.start < occupiedUntil) ids.add(b.carId);
  return ids;
}

export function clearOccupancySnapshot() {
  snapshot = null;
}
