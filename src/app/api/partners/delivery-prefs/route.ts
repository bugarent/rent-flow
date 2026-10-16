import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  listPartnerCountryDeliveryLocations,
  syncPartnerEnabledDeliveryLocationIds,
} from "@/lib/server/delivery-locations";
import {
  capFreeAfterDays,
  hasDeliveryPriceLimit,
  normalizeDeliveryPrice,
  type DeliveryLocationView,
} from "@/lib/delivery/pricing";
import { resetLegacyAutoDeliveryLimits } from "@/lib/server/delivery-price-limit";
import { StoreUnavailableError } from "@/lib/server/durable-fs";
import { syncPartnerDeliveryPricesToListings } from "@/lib/server/partner-delivery-listing-sync";
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

function panelItems(
  catalog: DeliveryLocationView[],
  prefs: PartnerDeliveryPref[],
  selectedIds: string[],
) {
  const prefById = new Map(prefs.map((p) => [p.deliveryLocationId, p]));
  const selected = new Set(selectedIds);
  return catalog.map((loc) => {
    const pref = prefById.get(loc.id);
    const { priceEur } = normalizeDeliveryPrice(loc.maxDeliveryPriceEur, pref?.priceEur ?? 0);
    const { freeAfterDays } = capFreeAfterDays(loc.maxFreeAfterDays, pref?.freeAfterDays ?? 0);
    // Explicit pref wins; otherwise legacy personal-info selection counts as ON.
    const enabled = pref ? pref.enabled !== false : selected.has(loc.id);
    return {
      location: loc,
      enabled,
      priceEur,
      freeAfterDays: freeAfterDays ?? 0,
      travelTimeMinutes: pref?.travelTimeMinutes ?? 0,
      maxDeliveryPriceEur: loc.maxDeliveryPriceEur,
      maxFreeAfterDays: loc.maxFreeAfterDays ?? null,
    };
  });
}

export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    await resetLegacyAutoDeliveryLimits();
    const [scoped, prefs, pricingCurrency, crossBorderEnabled] = await Promise.all([
      listPartnerCountryDeliveryLocations(partnerId),
      readPartnerDeliveryPrefs(partnerId),
      partnerPricingCurrency(partnerId),
      isPartnerCrossBorderEnabled(partnerId),
    ]);
    return NextResponse.json(
      {
        partnerId,
        pricingCurrency,
        countries: scoped.countries,
        items: panelItems(scoped.locations, prefs, scoped.selectedIds),
        crossBorderEnabled,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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
    const [scoped, previous] = await Promise.all([
      listPartnerCountryDeliveryLocations(partnerId),
      readPartnerDeliveryPrefs(partnerId),
    ]);
    const catalog = scoped.locations;
    const byId = new Map(catalog.map((l) => [l.id, l]));
    const previousById = new Map(previous.map((p) => [p.deliveryLocationId, p]));

    const next: PartnerDeliveryPref[] = [];
    for (const row of raw) {
      const id = String(row?.deliveryLocationId || "").trim();
      const loc = byId.get(id);
      if (!loc) continue;
      const capped = normalizeDeliveryPrice(loc.maxDeliveryPriceEur, Number(row?.priceEur));
      // The form shows prices already lowered to the admin limit. Saving that shown
      // value keeps the partner's own higher price, so raising the limit restores it.
      const stored = previousById.get(id)?.priceEur ?? 0;
      const keepStored =
        hasDeliveryPriceLimit(loc.maxDeliveryPriceEur) &&
        stored > capped.priceEur &&
        capped.priceEur >= loc.maxDeliveryPriceEur;
      const priceEur = keepStored ? stored : capped.priceEur;
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

    // Locations not in this payload keep prior prefs (writePartnerDeliveryPrefs merges).
    const saved = await writePartnerDeliveryPrefs(partnerId, next);

    // Search coverage follows ON locations for this partner's operating countries.
    const submittedById = new Map(next.map((p) => [p.deliveryLocationId, p]));
    const syncedIds = catalog
      .filter((loc) => {
        const submitted = submittedById.get(loc.id);
        if (submitted) return submitted.enabled !== false;
        const pref = saved.find((p) => p.deliveryLocationId === loc.id);
        return pref ? pref.enabled !== false : false;
      })
      .map((loc) => loc.id);

    await syncPartnerEnabledDeliveryLocationIds(partnerId, syncedIds);

    const listingsUpdated = await syncPartnerDeliveryPricesToListings(partnerId, saved, catalog).catch(
      (error) => {
        console.error("[partners/delivery-prefs PUT] listing sync", error);
        return 0;
      },
    );

    let crossBorderEnabled = await isPartnerCrossBorderEnabled(partnerId);
    if (typeof body?.crossBorderEnabled === "boolean") {
      await setPartnerCrossBorderEnabled(partnerId, body.crossBorderEnabled);
      crossBorderEnabled = body.crossBorderEnabled;
    }

    const refreshed = await listPartnerCountryDeliveryLocations(partnerId);
    return NextResponse.json(
      {
        ok: true,
        prefs: saved,
        countries: refreshed.countries,
        items: panelItems(refreshed.locations, saved, refreshed.selectedIds),
        listingsUpdated,
        crossBorderEnabled,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[partners/delivery-prefs PUT]", error);
    const message =
      error instanceof StoreUnavailableError ? error.message : "Could not save delivery preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
