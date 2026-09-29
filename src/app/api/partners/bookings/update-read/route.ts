import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import {
  isPartnerBookingUpdated,
  markPartnerBookingUpdateRead,
} from "@/lib/server/partner-booking-update-store";

export async function POST(req: Request) {
  const session = await getPartnerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { bookingId?: string };
    const bookingId = String(body.bookingId || "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    await markPartnerBookingUpdateRead(bookingId);
    return NextResponse.json(
      { ok: true, updatedUnread: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[partners/bookings/update-read]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getPartnerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bookingId = String(new URL(req.url).searchParams.get("bookingId") || "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }
  const updatedUnread = await isPartnerBookingUpdated(bookingId);
  return NextResponse.json(
    { updatedUnread },
    { headers: { "Cache-Control": "no-store" } },
  );
}
