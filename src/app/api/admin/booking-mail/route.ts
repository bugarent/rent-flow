import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/crypto";
import { requireAdminApi } from "@/lib/auth/sessions";
import { readBookingMailConfig, writeBookingMailConfig } from "@/lib/server/booking-mail-from";

function publicConfig(config: {
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}) {
  return {
    fromEmail: config.fromEmail,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpUser: config.smtpUser,
    smtpPassSet: Boolean(config.smtpPass),
  };
}

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(publicConfig(await readBookingMailConfig()));
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
  const saved = await writeBookingMailConfig({
    fromEmail,
    smtpHost: String(body.smtpHost || "").trim().slice(0, 200),
    smtpPort: Number(body.smtpPort || 587),
    smtpUser: String(body.smtpUser || "").trim().slice(0, 200),
    smtpPass: typeof body.smtpPass === "string" ? body.smtpPass.slice(0, 200) : "",
  });
  return NextResponse.json(publicConfig(saved));
}
