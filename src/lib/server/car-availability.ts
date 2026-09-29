import "server-only";

import { prisma } from "@/lib/prisma";
import { computeBufferEndsAt, rangesOverlap } from "@/lib/calendar/buffer";
import { carHasBlockConflict, carIdsBlockedInRange } from "@/lib/server/car-calendar-blocks-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { carIdsBlockedByChannels, channelBlocksCar } from "@/lib/server/channel-sync";
import { readAvailabilityCache, writeAvailabilityCache } from "@/lib/server/cache/availability-cache";

/**
 * Car IDs that cannot be rented for [rangeStart, rangeEnd] because of an
 * active booking. Each booking occupies [pickupAt, dropoffAt + 12h).
 */
export async function carIdsBookedInRange(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Set<string>> {
  const fromMs = rangeStart.getTime();
  const toMs = rangeEnd.getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return new Set();
  }

  // Search window including the post-rental prep buffer the new trip would need.
  const searchOccupiedUntil = computeBufferEndsAt(rangeEnd);

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        pickupAt: { lt: searchOccupiedUntil },
        bufferEndsAt: { gt: rangeStart },
      },
      select: { carId: true },
    });
    const ids = new Set(bookings.map((b) => b.carId).filter(Boolean));
    await mergeFileBookedCarIds(ids, rangeStart, searchOccupiedUntil);
    return ids;
  } catch (error) {
    if (isDbOfflineError(error)) {
      const ids = new Set<string>();
      await mergeFileBookedCarIds(ids, rangeStart, searchOccupiedUntil);
      return ids;
    }
    throw error;
  }
}

async function mergeFileBookedCarIds(into: Set<string>, rangeStart: Date, rangeEnd: Date) {
  try {
    const [{ listFileCars }, { listFileBookingsForCars }] = await Promise.all([
      import("@/lib/server/partner-cars-store"),
      import("@/lib/server/customer-bookings-store"),
    ]);
    const carIds = (await listFileCars()).map((c) => c.id);
    if (!carIds.length) return;
    const fileBookings = await listFileBookingsForCars(carIds, rangeStart, rangeEnd);
    for (const b of fileBookings) {
      if (b.status === "PENDING" || b.status === "CONFIRMED") into.add(b.carId);
    }
  } catch {
    /* file store optional */
  }
}

function availabilityCacheKey(rangeStart: Date, rangeEnd: Date) {
  const minute = (date: Date) => new Date(Math.floor(date.getTime() / 60_000) * 60_000).toISOString();
  return `avail:${minute(rangeStart)}:${minute(rangeEnd)}`;
}

/** Union of calendar-closed + booking-occupied + external-channel car IDs. */
export async function carIdsUnavailableInRange(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Set<string>> {
  const key = availabilityCacheKey(rangeStart, rangeEnd);
  const cached = await readAvailabilityCache(key);
  if (cached) return new Set(cached);
  const [blocked, booked, channels] = await Promise.all([
    carIdsBlockedInRange(rangeStart, rangeEnd).catch(() => new Set<string>()),
    carIdsBookedInRange(rangeStart, rangeEnd).catch(() => new Set<string>()),
    carIdsBlockedByChannels(rangeStart, rangeEnd).catch(() => new Set<string>()),
  ]);
  const ids = new Set([...blocked, ...booked, ...channels]);
  await writeAvailabilityCache(key, [...ids]);
  return ids;
}

/**
 * Strict check: car must be free of site bookings, file bookings, and calendar blocks
 * for [pickupAt, dropoffAt] (including prep buffers).
 */
export async function carHasBookingConflict(
  carId: string,
  pickupAt: Date,
  dropoffAt: Date,
  opts?: { excludeBookingId?: string; excludeBlockId?: string },
): Promise<boolean> {
  const occupiedUntil = computeBufferEndsAt(dropoffAt);

  try {
    const existing = await prisma.booking.findMany({
      where: {
        carId,
        status: { in: ["PENDING", "CONFIRMED"] },
        ...(opts?.excludeBookingId ? { id: { not: opts.excludeBookingId } } : {}),
      },
      select: { pickupAt: true, bufferEndsAt: true },
    });
    if (
      existing.some((b) => rangesOverlap(pickupAt, occupiedUntil, b.pickupAt, b.bufferEndsAt))
    ) {
      return true;
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  try {
    const { listFileBookingsForCars } = await import("@/lib/server/customer-bookings-store");
    const fileBookings = await listFileBookingsForCars([carId], pickupAt, occupiedUntil);
    for (const b of fileBookings) {
      if (opts?.excludeBookingId && b.id === opts.excludeBookingId) continue;
      if (b.status !== "PENDING" && b.status !== "CONFIRMED") continue;
      const bStart = new Date(b.pickupAt);
      const bEnd = new Date(b.bufferEndsAt || computeBufferEndsAt(new Date(b.dropoffAt)));
      if (rangesOverlap(pickupAt, occupiedUntil, bStart, bEnd)) return true;
    }
  } catch {
    /* file store optional */
  }

  if (await carHasBlockConflict(carId, pickupAt, dropoffAt, opts?.excludeBlockId)) return true;
  if (await channelBlocksCar(carId, pickupAt, dropoffAt)) return true;
  return false;
}
