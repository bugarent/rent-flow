import { NextResponse } from "next/server";
import { listDueIntegrations } from "@/lib/integrations/repository";
import { pullAvailability, pullFleet } from "@/lib/integrations/sync-engine";
import { purgeExpiredBookings } from "@/lib/server/purge-expired-bookings";
import { applyExpiredInsuranceRemoderation } from "@/lib/server/car-insurance-expiry";

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

  const retention = await purgeExpiredBookings().catch((error) => {
    console.warn("[cron] booking retention", error);
    return { removed: 0 };
  });

  const insuranceExpiry = await applyExpiredInsuranceRemoderation().catch((error) => {
    console.warn("[cron] insurance expiry", error);
    return { checked: 0, remodeated: 0 };
  });

  // Best-effort daily FX refresh when this worker also runs (primary schedule: /api/cron/fx-rates).
  const fx = await import("@/lib/server/fx-rates-sync")
    .then((m) => m.syncFxRatesToPlatform())
    .catch((error) => {
      console.warn("[cron] fx rates", error);
      return null;
    });

  const due = await listDueIntegrations();
  const results: Array<{ id: string; fleet?: unknown; availability?: unknown }> = [];

  for (const integration of due) {
    const fleet = await pullFleet(integration.id);
    const availability = await pullAvailability(integration.id);
    results.push({ id: integration.id, fleet, availability });
  }

  const channelFeeds = await import("@/lib/server/channel-sync")
    .then((mod) => mod.syncStaleChannelFeeds())
    .catch((error) => {
      console.warn("[cron] channel feeds", error);
      return 0;
    });

  return NextResponse.json({
    ok: true,
    processed: results.length,
    expiredBookingsRemoved: retention.removed,
    insuranceExpiry,
    fx,
    channelFeeds,
    results,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
