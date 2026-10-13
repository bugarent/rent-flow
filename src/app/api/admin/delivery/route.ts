import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  createDeliveryLocation,
  getPartnerOperatingCountryIso2s,
  listConfigurableAirports,
  listDeliveryLocations,
} from "@/lib/server/delivery-locations";
import { loadPartnerDeliveryCatalog } from "@/lib/server/partner-delivery-catalog";
import { DEFAULT_DELIVERY_MAX_EUR } from "@/lib/delivery/pricing";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const createSchema = z.object({
  airportId: z.string().min(1),
  maxDeliveryPriceEur: z.number().min(0).optional().default(DEFAULT_DELIVERY_MAX_EUR),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional(),
});

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const partnerId = new URL(req.url).searchParams.get("partnerId")?.trim();
    if (partnerId) {
      const locations = await loadPartnerDeliveryCatalog(partnerId);
      return NextResponse.json({ locations }, { headers: { "Cache-Control": "no-store" } });
    }
    const [locations, availableAirports, partnerCountries] = await Promise.all([
      listDeliveryLocations(),
      listConfigurableAirports(),
      getPartnerOperatingCountryIso2s(),
    ]);
    return NextResponse.json({
      locations,
      availableAirports: availableAirports.filter((a) => !a.alreadyConfigured),
      partnerCountries,
    });
  } catch (error) {
    console.error("[admin/delivery GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load delivery locations" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = createSchema.parse(await req.json());
    const row = await createDeliveryLocation({
      airportId: body.airportId,
      maxDeliveryPriceEur: body.maxDeliveryPriceEur,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[admin/delivery POST]", error);
    const message = error instanceof Error ? error.message : "Could not create delivery location";
    const status = message.includes("already configured") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
