import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listPartnerScopedDeliveryLocations } from "@/lib/server/delivery-locations";
import { capFreeAfterDays, normalizeDeliveryPrice } from "@/lib/delivery/pricing";
import {
  readPartnerDeliveryPrefs,
  writePartnerDeliveryPrefs,
  type PartnerDeliveryPref,
} from "@/lib/server/partner-delivery-prefs-store";
import {
  isPartnerCrossBorderEnabled,
  setPartnerCrossBorderEnabled,
} from "@/lib/server/partner-extras-prefs-store";
import { resolveCompanySettings, readCompanySettingsFile } from "@/lib/server/partner-company-settings-store";
import { DEFAULT_PARTNER_PRICING_CURRENCY } from "@/lib/partners/company-settings";

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

async function partnerPricingCurrency(partnerId: string): Promise<string> {
  try {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (partner) {
      const settings = await resolveCompanySettings(partner);
      return settings.pricingCurrency || DEFAULT_PARTNER_PRICING_CURRENCY;
    }
  } catch {
    /* file */
  }
  const file = await readCompanySettingsFile(partnerId);
  return file?.pricingCurrency || DEFAULT_PARTNER_PRICING_CURRENCY;
}

export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const [catalog, prefs, pricingCurrency, crossBorderEnabled] = await Promise.all([
      listPartnerScopedDeliveryLocations(partnerId),
      readPartnerDeliveryPrefs(partnerId),
      partnerPricingCurrency(partnerId),
      isPartnerCrossBorderEnabled(partnerId),
    ]);
    const prefById = new Map(prefs.map((p) => [p.deliveryLocationId, p]));

    const items = catalog.map((loc) => {
      const pref = prefById.get(loc.id);
      const { priceEur } = normalizeDeliveryPrice(loc.maxDeliveryPriceEur, pref?.priceEur ?? 0);
      const { freeAfterDays } = capFreeAfterDays(loc.maxFreeAfterDays, pref?.freeAfterDays ?? 0);
      return {
        location: loc,
        enabled: pref ? pref.enabled !== false : true,
        priceEur,
        freeAfterDays: freeAfterDays ?? 0,
        travelTimeMinutes: pref?.travelTimeMinutes ?? 0,
        maxDeliveryPriceEur: loc.maxDeliveryPriceEur,
        maxFreeAfterDays: loc.maxFreeAfterDays ?? null,
      };
    });

    return NextResponse.json({ partnerId, pricingCurrency, items, crossBorderEnabled });
  } catch (error) {
    console.error("[partners/delivery-prefs GET]", error);
    return NextResponse.json({ error: "Could not load delivery preferences" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const body = await req.json();
    const raw = Array.isArray(body?.prefs) ? body.prefs : Array.isArray(body) ? body : [];
    const catalog = await listPartnerScopedDeliveryLocations(partnerId);
    const byId = new Map(catalog.map((l) => [l.id, l]));

    const next: PartnerDeliveryPref[] = [];
    for (const row of raw) {
      const id = String(row?.deliveryLocationId || "").trim();
      const loc = byId.get(id);
      if (!loc) continue;
      const { priceEur } = normalizeDeliveryPrice(loc.maxDeliveryPriceEur, Number(row?.priceEur));
      const freeRaw = row?.freeAfterDays;
      const parsedFree =
        freeRaw == null || freeRaw === "" || Number.isNaN(Number(freeRaw))
          ? null
          : Math.max(0, Math.floor(Number(freeRaw)));
      const { freeAfterDays } = capFreeAfterDays(loc.maxFreeAfterDays, parsedFree);
      next.push({
        deliveryLocationId: id,
        enabled: row?.enabled === false ? false : true,
        priceEur,
        freeAfterDays,
        travelTimeMinutes: Math.max(0, Math.floor(Number(row?.travelTimeMinutes) || 0)),
      });
    }

    const saved = await writePartnerDeliveryPrefs(partnerId, next);

    let crossBorderEnabled = await isPartnerCrossBorderEnabled(partnerId);
    if (typeof body?.crossBorderEnabled === "boolean") {
      await setPartnerCrossBorderEnabled(partnerId, body.crossBorderEnabled);
      crossBorderEnabled = body.crossBorderEnabled;
    }

    return NextResponse.json({ ok: true, prefs: saved, crossBorderEnabled });
  } catch (error) {
    console.error("[partners/delivery-prefs PUT]", error);
    return NextResponse.json({ error: "Could not save delivery preferences" }, { status: 500 });
  }
}
