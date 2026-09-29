import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { resolvePartnerId } from "@/lib/server/partner-booking-access";
import { getChannelFeed } from "@/lib/server/channel-feeds-store";
import { syncChannelFeed } from "@/lib/server/channel-sync";

export async function POST(req: Request) {
  const session = await getPartnerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const feed = await getChannelFeed(String(body?.id || ""));
  if (!feed || feed.partnerId !== partnerId) {
    return NextResponse.json({ error: "ვერ მოიძებნა" }, { status: 404 });
  }
  const synced = await syncChannelFeed(feed);
  return NextResponse.json({
    ok: Boolean(synced && !synced.lastError),
    lastSyncAt: synced?.lastSyncAt || feed.lastSyncAt,
    lastError: synced?.lastError || feed.lastError,
    busyCount: synced?.busy.length ?? feed.busy.length,
  });
}
