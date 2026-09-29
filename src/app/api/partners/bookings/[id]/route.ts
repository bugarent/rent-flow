import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { getFileBooking, updateFileBooking } from "@/lib/server/customer-bookings-store";
import { loadBookingInfoDetail } from "@/lib/server/booking-info-detail";
import { markPartnerCancelledUnread } from "@/lib/server/admin-booking-unread-store";
import {
  assertPartnerOwnsBooking,
  resolvePartnerId,
} from "@/lib/server/partner-booking-access";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getPartnerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });

  const { id } = await ctx.params;
  const owned = await assertPartnerOwnsBooking(id, partnerId, session.user);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const booking = await loadBookingInfoDetail(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(
  _req: Request,
  _ctx: { params: Promise<{ id: string }> },
) {
  const session = await getPartnerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Partners are view-only for booking details
  return NextResponse.json(
    { error: "Partners cannot edit bookings" },
    { status: 403 },
  );
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getPartnerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });

  const { id } = await ctx.params;

  try {
    const owned = await assertPartnerOwnsBooking(id, partnerId, session.user);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const currentStatus =
      owned.kind === "file"
        ? owned.booking.status
        : (
            await prisma.booking.findUnique({
              where: { id: owned.booking.id },
              select: { status: true },
            })
          )?.status;

    if (currentStatus === "UNFULFILLED") {
      return NextResponse.json({ ok: true, status: "UNFULFILLED" });
    }

    if (owned.kind === "file") {
      const updated = await updateFileBooking(id, { status: "UNFULFILLED" });
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    } else {
      await prisma.booking.update({
        where: { id: owned.booking.id },
        data: { status: "UNFULFILLED" },
      });
      await updateFileBooking(id, { status: "UNFULFILLED" });
    }

    await markPartnerCancelledUnread(id);
    return NextResponse.json({ ok: true, status: "UNFULFILLED" });
  } catch (error) {
    if (isDbOfflineError(error)) {
      try {
        const fileBooking = await getFileBooking(id);
        if (!fileBooking) return NextResponse.json({ error: "Database offline" }, { status: 503 });
        if (fileBooking.status !== "UNFULFILLED") {
          await updateFileBooking(id, { status: "UNFULFILLED" });
          await markPartnerCancelledUnread(id);
        }
        return NextResponse.json({ ok: true, status: "UNFULFILLED" });
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: "Database offline" }, { status: 503 });
    }
    console.error("[partners/bookings DELETE]", error);
    return NextResponse.json({ error: "Could not delete booking" }, { status: 500 });
  }
}
