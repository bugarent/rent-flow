import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { loadBookingInfoDetail } from "@/lib/server/booking-info-detail";
import { createInvoiceShare } from "@/lib/server/invoice-share-store";

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { bookingId?: string };
    const bookingId = String(body.bookingId || "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    const booking = await loadBookingInfoDetail(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const share = await createInvoiceShare({
      bookingId,
      createdBy: String(session.user.email || session.user.name || "admin"),
    });
    const origin = new URL(req.url).origin;
    return NextResponse.json(
      { token: share.token, shareUrl: `${origin}/invoice/${share.token}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/invoice] POST share", error);
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }
}
