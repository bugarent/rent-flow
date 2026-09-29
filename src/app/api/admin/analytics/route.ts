import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { buildAdminBookingStatistics } from "@/lib/server/admin-booking-statistics";

function parseRange(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const start = from ? from : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
  const end = to ? to : new Date().toISOString().slice(0, 10);
  return { from: start, to: end };
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { from, to } = parseRange(new URL(req.url));
  const stats = await buildAdminBookingStatistics(from, to);
  return NextResponse.json({ from, to, ...stats });
}
