import { NextResponse } from "next/server";
import { formatBookingRef } from "@/lib/ids";

/**
 * Preview the next booking reference without allocating it.
 * Closing checkout without paying does not consume this number.
 */
export async function GET() {
  try {
    const { peekNextBookingSequentialNumber } = await import("@/lib/sequential-ids");
    const sequentialNumber = await peekNextBookingSequentialNumber();
    return NextResponse.json({
      sequentialNumber,
      reference: formatBookingRef(sequentialNumber),
      reserved: false,
    });
  } catch (error) {
    console.error("[bookings/next-ref GET]", error);
    return NextResponse.json({ error: "Could not preview booking number" }, { status: 500 });
  }
}
