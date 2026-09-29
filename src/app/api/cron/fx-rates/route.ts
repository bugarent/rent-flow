import { NextResponse } from "next/server";
import { syncFxRatesToPlatform } from "@/lib/server/fx-rates-sync";

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.FX_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("x-cron-secret") || "";
  const auth = req.headers.get("authorization") || "";
  return header === secret || auth === `Bearer ${secret}`;
}

/**
 * Daily FX rate sync (EUR base).
 * Schedule: 0 6 * * * (06:00 UTC) via Vercel Cron / external scheduler.
 */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncFxRatesToPlatform();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET(req: Request) {
  return POST(req);
}
