import { NextResponse } from "next/server";
import { mockUnlockBooking } from "@/lib/integrations/sandbox/simulator";
import { z } from "zod";

const schema = z.object({ lockId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const result = mockUnlockBooking(body.lockId);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid unlock payload" }, { status: 400 });
  }
}
