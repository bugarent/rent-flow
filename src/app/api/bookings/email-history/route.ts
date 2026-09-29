import { NextResponse } from "next/server";
import { z } from "zod";
import { loadEmailBookingHistory } from "@/lib/server/email-booking-history";

const schema = z.object({
  bookingNumber: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const result = await loadEmailBookingHistory(body);
    if (!result.ok) {
      const status = result.reason === "invalid" ? 400 : 404;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json({ bookings: result.bookings, chats: result.chats });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    console.error("[bookings/email-history POST]", error);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
}
