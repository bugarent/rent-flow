import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { resolvePartnerId } from "@/lib/server/partner-booking-access";
import { listPartnerOwnedCars } from "@/lib/server/partner-owned-cars";
import {
  CHANNEL_PROVIDERS,
  deleteChannelFeed,
  getChannelFeed,
  listChannelFeedsForPartner,
  upsertChannelFeed,
  type ChannelFeed,
  type ChannelProvider,
} from "@/lib/server/channel-feeds-store";
import { syncChannelFeed } from "@/lib/server/channel-sync";

const NO_STORE = { "Cache-Control": "no-store" };

async function partnerContext() {
  const session = await getPartnerSession();
  if (!session?.user?.id) return null;
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return null;
  const owner = { partnerId, userId: session.user.id, email: session.user.email || "" };
  return { session, partnerId, owner };
}

function feedJson(feed: ChannelFeed, origin: string) {
  return {
    id: feed.id,
    carId: feed.carId,
    provider: feed.provider,
    importUrl: feed.importUrl,
    exportUrl: `${origin}/api/channel/ical/${feed.exportToken}`,
    lastSyncAt: feed.lastSyncAt,
    lastError: feed.lastError,
    busyCount: feed.busy.length,
  };
}

export async function GET(req: Request) {
  const ctx = await partnerContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const carId = new URL(req.url).searchParams.get("carId") || "";
  const cars = await listPartnerOwnedCars(ctx.owner);
  const feeds = await listChannelFeedsForPartner(ctx.partnerId);
  const origin = new URL(req.url).origin;
  return NextResponse.json(
    {
      cars: cars
        .filter((car) => !carId || car.id === carId)
        .map((car) => ({
          id: car.id,
          label: `${car.make} ${car.model}`.trim() || car.title,
          registrationNumber: car.registrationNumber || "",
        })),
      feeds: feeds.filter((feed) => !carId || feed.carId === carId).map((feed) => feedJson(feed, origin)),
    },
    { headers: NO_STORE },
  );
}

export async function POST(req: Request) {
  const ctx = await partnerContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    carId?: string;
    provider?: string;
    importUrl?: string;
  } | null;
  const carId = String(body?.carId || "").trim();
  const provider = String(body?.provider || "ical").trim() as ChannelProvider;
  const importUrl = String(body?.importUrl || "").trim();
  if (!carId || !CHANNEL_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "აირჩიე მანქანა და არხი" }, { status: 400 });
  }
  const cars = await listPartnerOwnedCars(ctx.owner);
  if (!cars.some((car) => car.id === carId)) {
    return NextResponse.json({ error: "მანქანა ვერ მოიძებნა" }, { status: 404 });
  }
  if (importUrl) {
    try {
      const url = new URL(importUrl);
      if (url.protocol !== "https:") {
        return NextResponse.json({ error: "გარე კალენდრის ბმული https უნდა იყოს" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "კალენდრის ბმული არასწორია" }, { status: 400 });
    }
  }
  const feed = await upsertChannelFeed({
    partnerId: ctx.partnerId,
    carId,
    provider,
    importUrl,
  });
  const synced = await syncChannelFeed(feed);
  const saved = synced || (await getChannelFeed(feed.id)) || feed;
  if (synced) {
    const { noteReservationPublished } = await import("@/lib/server/channel-publish");
    await noteReservationPublished(carId);
  }
  return NextResponse.json({ feed: feedJson(saved, new URL(req.url).origin) }, { headers: NO_STORE });
}

export async function DELETE(req: Request) {
  const ctx = await partnerContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const ok = await deleteChannelFeed(id, ctx.partnerId);
  if (!ok) return NextResponse.json({ error: "ვერ მოიძებნა" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
