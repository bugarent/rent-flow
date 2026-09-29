import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { resolvePartnerId } from "@/lib/server/partner-booking-access";
import { listFileCarsForPartner, getFileCar, isFileCarOwner } from "@/lib/server/partner-cars-store";
import {
  CHANNEL_PROVIDERS,
  deleteChannelFeed,
  listChannelFeedsForPartner,
  upsertChannelFeed,
  type ChannelProvider,
} from "@/lib/server/channel-feeds-store";
import { syncChannelFeed } from "@/lib/server/channel-sync";

async function partnerContext() {
  const session = await getPartnerSession();
  if (!session?.user?.id) return null;
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return null;
  return { session, partnerId };
}

async function ownsCar(
  carId: string,
  partnerId: string,
  user: { id: string; email?: string | null },
) {
  const car = await getFileCar(carId);
  if (!car) return false;
  if (car.partnerId === partnerId) return true;
  return isFileCarOwner(car, user);
}

export async function GET(req: Request) {
  const ctx = await partnerContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cars = await listFileCarsForPartner({
    userId: ctx.session.user.id,
    email: ctx.session.user.email,
    partnerId: ctx.partnerId,
  });
  const feeds = await listChannelFeedsForPartner(ctx.partnerId);
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    cars: cars.map((car) => ({
      id: car.id,
      label: `${car.make} ${car.model}`.trim(),
      registrationNumber: car.registrationNumber || "",
    })),
    feeds: feeds.map((feed) => ({
      id: feed.id,
      carId: feed.carId,
      provider: feed.provider,
      importUrl: feed.importUrl,
      exportUrl: `${origin}/api/channel/ical/${feed.exportToken}`,
      lastSyncAt: feed.lastSyncAt,
      lastError: feed.lastError,
      busyCount: feed.busy.length,
    })),
  });
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
  if (!(await ownsCar(carId, ctx.partnerId, ctx.session.user))) {
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
  const synced = importUrl ? await syncChannelFeed(feed) : feed;
  const origin = new URL(req.url).origin;
  const saved = synced || feed;
  return NextResponse.json({
    feed: {
      id: saved.id,
      carId: saved.carId,
      provider: saved.provider,
      importUrl: saved.importUrl,
      exportUrl: `${origin}/api/channel/ical/${saved.exportToken}`,
      lastSyncAt: saved.lastSyncAt,
      lastError: saved.lastError,
      busyCount: saved.busy.length,
    },
  });
}

export async function DELETE(req: Request) {
  const ctx = await partnerContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const ok = await deleteChannelFeed(id, ctx.partnerId);
  if (!ok) return NextResponse.json({ error: "ვერ მოიძებნა" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
