import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/crypto";
import { requireAdminApi } from "@/lib/auth/sessions";
import { readBookingMailFrom, writeBookingMailFrom } from "@/lib/server/booking-mail-from";

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ fromEmail: await readBookingMailFrom() });
}

export async function PUT(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const fromEmail = String(body.fromEmail || "").trim();
  if (!isValidEmail(fromEmail)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  await writeBookingMailFrom(fromEmail);
  return NextResponse.json({ fromEmail });
}
