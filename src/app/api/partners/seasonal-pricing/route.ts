import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import {
  normalizeMd,
  parseSeasonalPricing,
  type PartnerSeasonPeriod,
  type PartnerSeasonalPricing,
} from "@/lib/partners/seasonal-pricing";
import { writePartnerSeasonalPricingFile } from "@/lib/server/partner-seasonal-pricing-store";

export async function PATCH(req: Request) {
  const session = await requirePartnerApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const enabled = Boolean(body?.enabled);
    const rawSeasons = Array.isArray(body?.seasons) ? body.seasons : [];
    const seasons: PartnerSeasonPeriod[] = [];
    for (const item of rawSeasons) {
      if (!item || typeof item !== "object") continue;
      const from = normalizeMd(item.from);
      const to = normalizeMd(item.to);
      if (!from || !to) {
        return NextResponse.json(
          { error: "Each season needs valid from/to dates (MM-DD)." },
          { status: 400 },
        );
      }
      seasons.push({ from, to });
    }

    let base: PartnerSeasonPeriod | undefined;
    if (body?.base && typeof body.base === "object") {
      const from = normalizeMd(body.base.from);
      const to = normalizeMd(body.base.to);
      if (from && to) base = { from, to };
    }

    const pricing: PartnerSeasonalPricing = parseSeasonalPricing({
      enabled,
      base,
      seasons: enabled ? seasons : seasons,
    });

    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    }

    try {
      await prisma.partner.update({
        where: { id: partner.id },
        data: { seasonalPricing: pricing },
      });
    } catch (dbError) {
      console.warn("[partners/seasonal-pricing] DB update failed, using file store", dbError);
    }

    await writePartnerSeasonalPricingFile(partner.id, pricing);
    return NextResponse.json({ seasonalPricing: pricing });
  } catch (error) {
    console.error("[partners/seasonal-pricing PATCH]", error);
    return NextResponse.json({ error: "Failed to save seasonal pricing" }, { status: 500 });
  }
}
