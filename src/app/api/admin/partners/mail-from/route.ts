import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { isValidEmail } from "@/lib/crypto";
import { readPartnerMailFrom, writePartnerMailFrom } from "@/lib/server/partner-mail-from";

export async function GET() {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ fromEmail: await readPartnerMailFrom() });
}

/** Empty value clears it (messages then go from the site's default sender). */
export async function PUT(req: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { fromEmail?: unknown };
  const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim() : "";
  if (fromEmail && !isValidEmail(fromEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  try {
    return NextResponse.json({ fromEmail: await writePartnerMailFrom(fromEmail) });
  } catch (error) {
    console.error("[admin/partners/mail-from PUT]", error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
