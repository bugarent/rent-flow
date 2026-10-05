import { NextResponse } from "next/server";
import { isValidEmail, normalizeLogin } from "@/lib/crypto";
import { requireAdminApi } from "@/lib/auth/sessions";
import { sendPartnerMail } from "@/lib/mail";
import { loadBookingCustomers } from "@/lib/server/load-booking-customers";
import { readCustomerNotifyFrom, writeCustomerNotifyFrom } from "@/lib/server/customer-notify-from";

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fromEmail = await readCustomerNotifyFrom();
  return NextResponse.json({ fromEmail });
}

export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const fromEmail = String(body.fromEmail || "").trim();
  const text = String(body.text || "").trim();
  const country = String(body.country || "all").trim();

  if (!isValidEmail(fromEmail)) {
    return NextResponse.json({ error: "from" }, { status: 400 });
  }
  if (!text || text.length > 5000) {
    return NextResponse.json({ error: "text" }, { status: 400 });
  }

  await writeCustomerNotifyFrom(fromEmail);

  const { customers } = await loadBookingCustomers();
  const wanted = country.toLowerCase() === "all" ? null : country;
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const row of customers) {
    const email = String(row.email || "").trim();
    if (!isValidEmail(email)) continue;
    if (wanted && row.countryLabel !== wanted) continue;
    const key = normalizeLogin(email);
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(email);
  }

  if (!recipients.length) {
    return NextResponse.json({ error: "none", total: 0 }, { status: 400 });
  }
  if (recipients.length > 500) {
    return NextResponse.json({ error: "too-many", total: recipients.length }, { status: 400 });
  }

  const subject = text.split("\n")[0]?.trim().slice(0, 120) || "შეტყობინება";
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    const result = await sendPartnerMail({
      to,
      from: fromEmail,
      replyTo: fromEmail,
      subject,
      text,
      html: `<div style="font-family:sans-serif;line-height:1.5;white-space:pre-wrap">${safe}</div>`,
      event: "CUSTOMER_NOTICE",
      payload: { fromEmail, country: wanted || "all" },
    });
    if (result.sent) sent += 1;
    else failed += 1;
  }

  if (sent === 0) {
    return NextResponse.json({ error: "smtp", total: recipients.length, sent, failed }, { status: 502 });
  }

  return NextResponse.json({ ok: true, total: recipients.length, sent, failed });
}
