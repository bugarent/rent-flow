import "server-only";

import { bookingRetentionCutoff } from "@/lib/bookings/retention";
import { prisma } from "@/lib/prisma";
import { archiveBookingForReports } from "@/lib/server/admin-booking-facts";
import {
  deleteFileBookings,
  listAllFileBookings,
} from "@/lib/server/customer-bookings-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  deleteCustomBookingChat,
  listCustomBookingChats,
} from "@/lib/server/custom-booking-chat-store";

const PURGE_INTERVAL_MS = 15 * 60 * 1000;
let lastPurgeAt = 0;
let purgeInFlight: Promise<{ removed: number }> | null = null;

async function purgeExpiredBookingsNow(): Promise<{ removed: number }> {
  const cutoff = bookingRetentionCutoff();
  const cutoffMs = cutoff.getTime();
  let removed = 0;

  const files = await listAllFileBookings();
  const expiredFileIds = files
    .filter((row) => {
      const start = new Date(row.pickupAt).getTime();
      return Number.isFinite(start) && start < cutoffMs;
    })
    .map((row) => row.id);

  for (const id of expiredFileIds) {
    try {
      await archiveBookingForReports(id);
    } catch (error) {
      console.warn("[booking-retention] archive file", id, error);
    }
  }
  removed += await deleteFileBookings(expiredFileIds);

  const bookingDb = prisma.booking as unknown as {
    findMany: (args: { where: object; select: object }) => Promise<Array<{ id: string }>>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
  try {
    const expired = await bookingDb.findMany({
      where: { pickupAt: { lt: cutoff } },
      select: { id: true },
    });
    for (const row of expired) {
      try {
        await archiveBookingForReports(row.id);
      } catch (error) {
        console.warn("[booking-retention] archive prisma", row.id, error);
      }
      try {
        await bookingDb.delete({ where: { id: row.id } });
        removed += 1;
      } catch (error) {
        if (!isDbOfflineError(error)) {
          console.warn("[booking-retention] delete prisma", row.id, error);
        }
      }
    }
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[booking-retention] prisma scan", error);
    }
  }

  try {
    const chats = await listCustomBookingChats();
    for (const chat of chats) {
      const start = new Date(chat.pickupAt || chat.createdAt).getTime();
      if (!Number.isFinite(start) || start >= cutoffMs) continue;
      if (await deleteCustomBookingChat(chat.id)) removed += 1;
    }
  } catch (error) {
    console.warn("[booking-retention] chats", error);
  }

  return { removed };
}

/** Drop guest bookings 30 days after the rental start. Finance archives stay. */
export async function purgeExpiredBookings(opts?: { force?: boolean }): Promise<{ removed: number }> {
  const now = Date.now();
  if (!opts?.force && now - lastPurgeAt < PURGE_INTERVAL_MS) {
    return { removed: 0 };
  }
  if (purgeInFlight) return purgeInFlight;

  lastPurgeAt = now;
  purgeInFlight = purgeExpiredBookingsNow().finally(() => {
    purgeInFlight = null;
  });
  return purgeInFlight;
}
