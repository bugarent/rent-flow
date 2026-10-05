import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getRefundUnreadTotal,
  listBookingRefunds,
  deleteBookingRefund,
  markAllRefundsRead,
  markBookingRefunded,
  type BookingRefundStatus,
} from "@/lib/server/admin-booking-refunds-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const status = new URL(req.url).searchParams.get("status") as BookingRefundStatus | null;
  const refunds = await listBookingRefunds(
    status === "PENDING" || status === "REFUNDED" || status === "CANCELLED"
      ? { status }
      : undefined,
  );

  const { expandRefundChangesFromTrip } = await import(
    "@/lib/bookings/refund-change-details"
  );
  const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
  const detailCache = new Map<
    string,
    Awaited<ReturnType<typeof loadBookingInfoDetail>>
  >();
  const enriched = await Promise.all(
    refunds.map(async (r) => {
      if (r.changes?.some((c) => c.type === "extra")) {
        return {
          ...r,
          changes: expandRefundChangesFromTrip({
            changes: r.changes,
            depositPercent: r.depositPercent,
            dailyRateEur: 0,
            extras: [],
          }),
        };
      }
      let detail = detailCache.get(r.bookingId);
      if (detail === undefined) {
        detail = await loadBookingInfoDetail(r.bookingId);
        detailCache.set(r.bookingId, detail);
      }
      if (!detail) return r;
      return {
        ...r,
        changes: expandRefundChangesFromTrip({
          changes: r.changes,
          depositPercent: r.depositPercent,
          dailyRateEur: Number(detail.car.dailyRateEur) || 0,
          rentalLabel: "მანქანის ქირა",
          extras: detail.extras || [],
        }),
      };
    }),
  );

  const unreadTotal = await getRefundUnreadTotal();
  return NextResponse.json(
    { refunds: enriched, unreadTotal },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      refundId?: string;
      action?: "refund" | "markAllRead" | "delete";
    };
    if (body.action === "markAllRead") {
      const cleared = await markAllRefundsRead();
      const unreadTotal = await getRefundUnreadTotal();
      return NextResponse.json(
        { ok: true, cleared, unreadTotal },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (body.action === "delete") {
      if (!body.refundId) {
        return NextResponse.json({ error: "refundId required" }, { status: 400 });
      }
      const removed = await deleteBookingRefund(String(body.refundId));
      if (!removed) {
        return NextResponse.json({ error: "Refund not found" }, { status: 404 });
      }
      const unreadTotal = await getRefundUnreadTotal();
      return NextResponse.json(
        { ok: true, unreadTotal },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (body.action !== "refund" || !body.refundId) {
      return NextResponse.json(
        { error: "refundId and action=refund|markAllRead|delete required" },
        { status: 400 },
      );
    }
    const updated = await markBookingRefunded(
      String(body.refundId),
      String(session.user.email || session.user.name || "admin"),
    );
    if (!updated) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, refund: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/bookings/refunds] POST", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
