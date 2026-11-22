import { NextResponse } from "next/server";
import { discardUnpaidOnlineCheckout } from "@/lib/server/booking-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guest left checkout before the gateway charged/held funds.
 * Cancels the unpaid online booking so it never appears as active.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { bookingId?: unknown } | null;
    const bookingId = String(body?.bookingId || "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    const discarded = await discardUnpaidOnlineCheckout(bookingId);
    return NextResponse.json({ ok: true, discarded });
  } catch (error) {
    console.error("[bookings/abandon-unpaid]", error);
    return NextResponse.json({ error: "Could not abandon booking" }, { status: 500 });
  }
}
