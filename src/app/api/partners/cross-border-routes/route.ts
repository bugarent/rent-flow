import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listPartnerCountryDeliveryLocations } from "@/lib/server/delivery-locations";
import { StoreUnavailableError } from "@/lib/server/durable-fs";
import {
  readPartnerCrossBorderRoutes,
  writePartnerCrossBorderRoutes,
  cleanCrossBorderRoute,
} from "@/lib/server/partner-cross-border-routes-store";

async function resolvePartnerId(userId: string, email?: string | null): Promise<string> {
  try {
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (partner?.id) return partner.id;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const local = loadLocalPartner();
  if (userId === LOCAL_PARTNER_ID || local?.id === userId || (email && local?.email === email)) {
    return LOCAL_PARTNER_ID;
  }
  return userId || LOCAL_PARTNER_ID;
}

export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const routes = await readPartnerCrossBorderRoutes(partnerId);
    return NextResponse.json({ routes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[partners/cross-border-routes GET]", error);
    return NextResponse.json({ error: "Could not load border-crossing routes" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.routes) ? body.routes : [];
    const scoped = await listPartnerCountryDeliveryLocations(partnerId);
    const byId = new Map(scoped.locations.map((loc) => [loc.id, loc]));
    const seen = new Set<string>();
    const next = [];
    for (const row of raw.slice(0, 40)) {
      const cleaned = cleanCrossBorderRoute(row);
      if (!cleaned) continue;
      const pickup = byId.get(cleaned.pickupLocationId);
      const dropoff = byId.get(cleaned.returnLocationId);
      if (!pickup || !dropoff) continue;
      const from = (pickup.countryIso2 || "").toUpperCase();
      const to = (dropoff.countryIso2 || "").toUpperCase();
      if (!from || !to || from === to) continue;
      const key = `${cleaned.pickupLocationId}>${cleaned.returnLocationId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(cleaned);
    }
    const routes = await writePartnerCrossBorderRoutes(partnerId, next);
    return NextResponse.json({ ok: true, routes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[partners/cross-border-routes PUT]", error);
    const message =
      error instanceof StoreUnavailableError ? error.message : "Could not save border-crossing routes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
