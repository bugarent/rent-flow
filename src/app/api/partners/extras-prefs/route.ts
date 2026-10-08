import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listExtraServices } from "@/lib/server/extras-store";
import {
  listPartnerCustomExtrasAsPricing,
} from "@/lib/server/partner-custom-extras-store";
import {
  readPartnerExtraPrefs,
  writePartnerExtraPrefs,
  type PartnerExtraPref,
} from "@/lib/server/partner-extras-prefs-store";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import {
  capPartnerMaxPeriod,
  clampPartnerDailyPrice,
  isMandatoryExtra,
  isMandatoryFreeExtra,
  isPeriodForcedFreeExtra,
  optionalPeriodMoney,
} from "@/lib/extras/pricing";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { parseCarDetails } from "@/lib/cars/car-details";
import { syncListingExtraPrices } from "@/lib/server/sync-listing-extra-prices";

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

function periodCeiling(
  adminMax: number | null | undefined,
  partnerMax: number | null,
): number | null {
  return partnerMax ?? optionalPeriodMoney(adminMax);
}

async function partnerCatalog(partnerId: string) {
  const [global, customs] = await Promise.all([
    listExtraServices({ activeOnly: true }),
    listPartnerCustomExtrasAsPricing(partnerId, { activeOnly: true }),
  ]);
  const byId = new Map(global.map((s) => [s.id, s]));
  for (const custom of customs) {
    if (!byId.has(custom.id)) byId.set(custom.id, custom);
  }
  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

async function listPartnerCarsForExtras(
  session: { user: { id: string; email?: string | null } },
  partnerId: string,
) {
  const cars: Array<{
    id: string;
    title: string;
    make: string;
    model: string;
    year: number;
    categorySlug: string | null;
    registrationNumber: string | null;
  }> = [];
  const seen = new Set<string>();

  try {
    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
    if (partner?.id) {
      const dbCars = await prisma.car.findMany({
        where: { partnerId: partner.id },
        select: {
          id: true,
          title: true,
          make: true,
          model: true,
          year: true,
          categorySlug: true,
          description: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      for (const c of dbCars) {
        seen.add(c.id);
        const details = parseCarDetails(c.description);
        cars.push({
          id: c.id,
          title: c.title,
          make: c.make,
          model: c.model,
          year: c.year,
          categorySlug:
            c.categorySlug || String(details?.categorySlug || details?.bodyType || "") || null,
          registrationNumber: String(details?.plate || "").trim() || null,
        });
      }
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  const fileCars = await listFileCarsForPartner({
    userId: session.user.id,
    email: session.user.email,
    partnerId,
  });
  for (const c of fileCars) {
    if (seen.has(c.id)) continue;
    const details = parseCarDetails(c.description);
    cars.push({
      id: c.id,
      title: c.title,
      make: c.make,
      model: c.model,
      year: c.year,
      categorySlug:
        c.categorySlug || String(details?.categorySlug || details?.bodyType || "") || null,
      registrationNumber: c.registrationNumber || String(details?.plate || "").trim() || null,
    });
  }

  return cars;
}

function cleanCarIds(raw: unknown, allowed: Set<string>): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = [
    ...new Set(
      raw
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ];
  // If fleet listing failed / empty, do not wipe client selections.
  if (!allowed.size) return ids;
  const filtered = ids.filter((id) => allowed.has(id));
  // Keep originals when none matched (id drift) so saves are not silently emptied.
  if (!filtered.length && ids.length) return ids;
  return filtered;
}

export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const [catalog, prefsRaw, cars] = await Promise.all([
      partnerCatalog(partnerId),
      readPartnerExtraPrefs(partnerId),
      listPartnerCarsForExtras(session, partnerId),
    ]);
    const catalogById = new Map(catalog.map((service) => [service.id, service]));
    // Clamp in memory for the response only — never write prefs on GET (was slowing every open).
    const prefs = prefsRaw.map((pref) => {
      const service = catalogById.get(pref.extraServiceId);
      if (!service) return pref;
      if (isPeriodForcedFreeExtra(service) && !pref.forbidden) {
        if (pref.priceEur === 0 && pref.minPeriodEur == null && pref.maxPeriodEur == null) return pref;
        return { ...pref, priceEur: 0, minPeriodEur: null, maxPeriodEur: null };
      }
      const { maxPeriodEur, capped } = capPartnerMaxPeriod(service.maxPeriodEur, pref.maxPeriodEur);
      let minPeriodEur = optionalPeriodMoney(pref.minPeriodEur);
      const ceiling = periodCeiling(service.maxPeriodEur, maxPeriodEur);
      const minLowered = minPeriodEur != null && ceiling != null && minPeriodEur > ceiling;
      if (minLowered) minPeriodEur = ceiling;
      const priceEur = pref.forbidden
        ? 0
        : clampPartnerDailyPrice(service.minPriceEur, service.maxPriceEur, pref.priceEur);
      const priceChanged = priceEur !== Number(pref.priceEur);
      if (!capped && !minLowered && !priceChanged) return pref;
      return { ...pref, maxPeriodEur, minPeriodEur, priceEur };
    });
    const prefById = new Map(prefs.map((p) => [p.extraServiceId, p]));
    const allCarIds = cars.map((c) => c.id);

    const items = catalog
      .filter((service) => {
        if (!isCrossBorderExtra(service)) return true;
        const pref = prefById.get(service.id);
        return Boolean(pref?.enabled) && !pref?.forbidden;
      })
      .map((service) => {
      const mandatory = isMandatoryExtra(service);
      const mandatoryFree = isMandatoryFreeExtra(service);
      const pref = prefById.get(service.id);
      const max = service.maxPriceEur;
      const forbidden = mandatory ? false : Boolean(pref?.forbidden);
      const defaultPrice =
        mandatoryFree || forbidden || isPeriodForcedFreeExtra(service)
          ? 0
          : clampPartnerDailyPrice(
              service.minPriceEur,
              max,
              mandatory
                ? pref?.priceEur ?? 0
                : pref?.priceEur ?? service.defaultPriceEur ?? service.minPriceEur ?? 0,
            );
      const carIds = Array.isArray(pref?.carIds) ? pref.carIds.map(String) : allCarIds;
      return {
        service,
        enabled: mandatory ? true : forbidden ? true : Boolean(pref?.enabled),
        forbidden,
        priceEur: defaultPrice,
        maxPriceEur: max,
        minPeriodEur: mandatoryFree || forbidden ? null : pref?.minPeriodEur ?? null,
        maxPeriodEur: mandatoryFree || forbidden ? null : pref?.maxPeriodEur ?? null,
        carIds: mandatory ? allCarIds : carIds,
      };
    });

    return NextResponse.json({ partnerId, items, cars });
  } catch (error) {
    console.error("[partners/extras-prefs GET]", error);
    return NextResponse.json({ error: "Could not load extras preferences" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const body = await req.json();
    const raw = Array.isArray(body?.prefs) ? body.prefs : Array.isArray(body) ? body : [];
    const [catalog, cars] = await Promise.all([
      partnerCatalog(partnerId),
      listPartnerCarsForExtras(session, partnerId),
    ]);
    const byId = new Map(catalog.map((s) => [s.id, s]));
    const allowedCarIds = new Set(cars.map((c) => c.id));

    const next: PartnerExtraPref[] = [];
    for (const row of raw) {
      const id = String(row?.extraServiceId || "").trim();
      const service = byId.get(id);
      if (!service) continue;
      const mandatory = isMandatoryExtra(service);
      const mandatoryFree = isMandatoryFreeExtra(service);
      const forbidden = mandatory ? false : Boolean(row?.forbidden);
      const cleanedIds = cleanCarIds(row?.carIds, allowedCarIds);
      // undefined = legacy "all cars"; [] = explicitly none; otherwise filtered list.
      const carIds = mandatory
        ? [...allowedCarIds]
        : cleanedIds !== undefined
          ? cleanedIds
          : [...allowedCarIds];
      let minPeriodEur =
        mandatoryFree || forbidden || isPeriodForcedFreeExtra(service)
          ? null
          : optionalPeriodMoney(row?.minPeriodEur);
      let maxPeriodEur =
        mandatoryFree || forbidden || isPeriodForcedFreeExtra(service)
          ? null
          : optionalPeriodMoney(row?.maxPeriodEur);
      if (!mandatoryFree && !forbidden && !isPeriodForcedFreeExtra(service)) {
        maxPeriodEur = capPartnerMaxPeriod(service.maxPeriodEur, maxPeriodEur).maxPeriodEur;
      }
      const ceiling = periodCeiling(service.maxPeriodEur, maxPeriodEur);
      if (minPeriodEur != null && ceiling != null && minPeriodEur > ceiling) {
        minPeriodEur = ceiling;
      }
      next.push({
        extraServiceId: id,
        enabled: mandatory ? true : forbidden ? true : Boolean(row?.enabled),
        forbidden,
        priceEur:
          mandatoryFree || forbidden || isPeriodForcedFreeExtra(service)
            ? 0
            : clampPartnerDailyPrice(service.minPriceEur, service.maxPriceEur, Number(row?.priceEur)),
        minPeriodEur,
        maxPeriodEur,
        carIds,
      });
    }

    // Keep master cross-border toggle state if the equipment panel did not include that row.
    const existing = await readPartnerExtraPrefs(partnerId);
    for (const pref of existing) {
      const svc = byId.get(pref.extraServiceId);
      if (!svc || !isCrossBorderExtra(svc)) continue;
      if (next.some((p) => p.extraServiceId === pref.extraServiceId)) continue;
      next.push(pref);
    }

    const saved = await writePartnerExtraPrefs(partnerId, next);
    const catalogById = new Map(catalog.map((service) => [service.id, service]));
    await syncListingExtraPrices({
      carIds: cars.map((car) => car.id),
      userId: session.user.id,
      email: session.user.email,
      partnerId,
      prices: saved.map((pref) => {
        const service = catalogById.get(pref.extraServiceId);
        return {
          extraServiceId: pref.extraServiceId,
          slug: service?.slug,
          name: service?.name,
          priceEur: pref.forbidden ? 0 : Number(pref.priceEur) || 0,
        };
      }),
    });
    return NextResponse.json({ ok: true, prefs: saved });
  } catch (error) {
    console.error("[partners/extras-prefs PUT]", error);
    return NextResponse.json({ error: "Could not save extras preferences" }, { status: 500 });
  }
}
