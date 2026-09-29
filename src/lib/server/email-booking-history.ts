import "server-only";

import { bookingRetentionCutoff, isWithinBookingRetention } from "@/lib/bookings/retention";
import { bookingSequentialCandidates } from "@/lib/bookings/sequential-candidates";
import { parseCustomBookingCode } from "@/lib/catalog/custom-booking-chat";
import { parseBookingRef } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { loadBookingInfoDetail } from "@/lib/server/booking-info/load";
import type { BookingInfoDetailPayload } from "@/lib/server/booking-info/types";
import {
  listCustomBookingChats,
  publicChatView,
} from "@/lib/server/custom-booking-chat-store";
import { listFileBookingsByEmail } from "@/lib/server/customer-bookings-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { purgeExpiredBookings } from "@/lib/server/purge-expired-bookings";

export type EmailHistoryChat = ReturnType<typeof publicChatView>;

function sameEmail(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function guestBooking(detail: BookingInfoDetailPayload, createdAt: string) {
  const { adminRefundAlerts: _adminOnly, ...guest } = detail;
  return { ...guest, createdAt };
}

export async function loadEmailBookingHistory(input: { email: string; bookingNumber: string }) {
  await purgeExpiredBookings({ force: true });

  const email = input.email.trim().toLowerCase();
  const parsed = parseBookingRef(input.bookingNumber);
  if (!email || parsed == null) return { ok: false as const, reason: "invalid" as const };

  const candidates = new Set(bookingSequentialCandidates(parsed));
  const typedCode = parseCustomBookingCode(input.bookingNumber);
  const cutoff = bookingRetentionCutoff();

  const fileRows = (await listFileBookingsByEmail(email)).filter((row) =>
    isWithinBookingRetention(row.createdAt),
  );

  let prismaRows: Array<{ id: string; sequentialNumber: number; createdAt: Date }> = [];
  const bookingDb = prisma.booking as unknown as {
    findMany: (args: {
      where: object;
      select: object;
      orderBy: object;
    }) => Promise<Array<{ id: string; sequentialNumber: number; createdAt: Date }>>;
  };
  try {
    prismaRows = await bookingDb.findMany({
      where: {
        guestEmail: { equals: email, mode: "insensitive" },
        createdAt: { gte: cutoff },
      },
      select: { id: true, sequentialNumber: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[email-booking-history] prisma", error);
    }
  }

  const chats = (await listCustomBookingChats()).filter(
    (chat) => sameEmail(chat.email, email) && isWithinBookingRetention(chat.createdAt),
  );

  const numberMatches =
    fileRows.some((row) => candidates.has(row.sequentialNumber)) ||
    prismaRows.some((row) => candidates.has(row.sequentialNumber)) ||
    chats.some((chat) => {
      if (candidates.has(chat.sequentialNumber)) return true;
      if (chat.bookingSequentialNumber != null && candidates.has(chat.bookingSequentialNumber)) {
        return true;
      }
      return Boolean(typedCode && typedCode.toUpperCase() === chat.code.toUpperCase());
    });

  if (!numberMatches) return { ok: false as const, reason: "not_found" as const };

  const createdAtById = new Map<string, string>();
  for (const row of fileRows) createdAtById.set(row.id, row.createdAt);
  for (const row of prismaRows) createdAtById.set(row.id, row.createdAt.toISOString());

  const bookings = [];
  for (const id of createdAtById.keys()) {
    const detail = await loadBookingInfoDetail(id);
    if (!detail) continue;
    if (!sameEmail(detail.guestEmail || "", email)) continue;
    bookings.push(guestBooking(detail, createdAtById.get(id) || ""));
  }

  bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const visibleChats = chats
    .map((chat) => publicChatView(chat))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!bookings.length && !visibleChats.length) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return {
    ok: true as const,
    bookings,
    chats: visibleChats,
  };
}
