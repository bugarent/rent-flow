import { NextResponse } from "next/server";
import { mockLockBooking } from "@/lib/integrations/sandbox/simulator";
import { bookingLockSchema } from "@/lib/integrations/types";

export async function POST(req: Request) {
  try {
    const body = bookingLockSchema.parse(await req.json());
    const result = mockLockBooking(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid lock payload" }, { status: 400 });
  }
}
