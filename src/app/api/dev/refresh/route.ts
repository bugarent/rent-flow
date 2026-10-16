import { NextResponse } from "next/server";
import { reopenDbCircuit } from "@/lib/prisma";
import { clearSearchAirportsCache } from "@/lib/server/delivery-locations";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

/**
 * Force the running Next process to drop public TTL/caches and re-read Neon.
 * Local/dev: always allowed. Production: requires Authorization: Bearer $CRON_SECRET.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const secret = (process.env.CRON_SECRET || "").trim();
    const auth = req.headers.get("authorization") || "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  reopenDbCircuit();
  clearSearchAirportsCache();
  revalidatePublishedContent();

  return NextResponse.json(
    {
      ok: true,
      refreshedAt: new Date().toISOString(),
      dbTarget: (process.env.DATABASE_URL || "").replace(/:[^@/]+@/, ":***@").slice(0, 120),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(req: Request) {
  return POST(req);
}
