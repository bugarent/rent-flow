import { NextResponse } from "next/server";

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.INTEGRATIONS_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("x-cron-secret") || "";
  const auth = req.headers.get("authorization") || "";
  return header === secret || auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { syncStaleChannelFeeds } = await import("@/lib/server/channel-sync");
  const synced = await syncStaleChannelFeeds().catch((error) => {
    console.warn("[cron] ical sync", error);
    return 0;
  });
  return NextResponse.json({ ok: true, synced }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  return POST(req);
}
