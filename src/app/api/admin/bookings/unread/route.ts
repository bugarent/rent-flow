import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getBookingUnreadTotal,
  listPartnerCancelledUnreadIds,
  listUnreadBookingIds,
  markAllBookingsRead,
  markBookingRead,
  markBookingsRead,
  pruneBookingUnread,
} from "@/lib/server/admin-booking-unread-store";
import { listAllFileBookings } from "@/lib/server/customer-bookings-store";
import { isDbOfflineError } from "@/lib/server/db-errors";

async function existingBookingIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.booking.findMany({ select: { id: true } });
    for (const row of rows) ids.add(row.id);
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/bookings/unread] prisma", error);
    }
  }
  try {
    for (const b of await listAllFileBookings()) ids.add(b.id);
  } catch {
    /* ignore */
  }
  return ids;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const existing = await existingBookingIds();
    const unreadTotal = await pruneBookingUnread(existing);
    const [unreadIds, partnerCancelledIds] = await Promise.all([
      listUnreadBookingIds(),
      listPartnerCancelledUnreadIds(),
    ]);
    return NextResponse.json(
      { unreadTotal, unreadIds, partnerCancelledIds },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/bookings/unread] GET", error);
    const unreadTotal = await getBookingUnreadTotal();
    return NextResponse.json(
      { unreadTotal, unreadIds: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      markAll?: boolean;
      markRead?: string;
      markReadIds?: string[];
    };

    if (body.markAll) {
      await markAllBookingsRead();
    } else if (Array.isArray(body.markReadIds) && body.markReadIds.length) {
      await markBookingsRead(body.markReadIds);
    } else if (body.markRead) {
      await markBookingRead(String(body.markRead));
    }

    const unreadTotal = await getBookingUnreadTotal();
    return NextResponse.json(
      { ok: true, unreadTotal },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/bookings/unread] POST", error);
    return NextResponse.json({ error: "Failed to update unread" }, { status: 500 });
  }
}
