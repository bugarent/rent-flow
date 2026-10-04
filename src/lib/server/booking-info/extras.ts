import "server-only";

import { prisma } from "@/lib/prisma";
import { getFileCar } from "@/lib/server/partner-cars-store";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import { pickServiceLabel } from "@/lib/extras/service-label";

export function localizedLabel(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "en" in value) {
    const en = (value as { en?: unknown }).en;
    if (typeof en === "string" && en.trim()) return en;
  }
  return fallback;
}

export function mapFileExtras(
  extras: Array<{ id: string; label: string; priceEur: number; qty?: number }> | undefined,
) {
  return (extras || []).map((e) => ({
    id: e.id,
    label: e.label,
    priceEur: Number(e.priceEur) || 0,
    ...(e.qty != null ? { qty: e.qty } : {}),
  }));
}

export async function hydrateBookingExtraLabels(
  extras: Array<{ id: string; label: string; priceEur: number; qty?: number }>,
) {
  if (!extras.length) return extras;
  try {
    const { extraServiceNameById } = await import("@/lib/server/extras/names");
    const names = await extraServiceNameById();
    return extras.flatMap((e) => {
      const label = pickServiceLabel(names.get(e.id), e.label);
      if (!label) return [];
      return [{ ...e, label }];
    });
  } catch {
    return extras.flatMap((e) => {
      const label = pickServiceLabel(e.label);
      if (!label) return [];
      return [{ ...e, label }];
    });
  }
}

export async function catalogExtrasForCar(carId: string): Promise<
  Array<{
    id: string;
    label: string;
    priceEurPerDay: number;
    locked?: boolean;
    maxPeriodEur?: number | null;
    minPeriodEur?: number | null;
  }>
> {
  const { isMandatoryExtra } = await import("@/lib/extras/pricing");
  try {
    const fileCar = await getFileCar(carId);
    if (fileCar?.extras?.length) {
      const { hydrateListingExtras, applyPartnerExtraOfferModes, mergePartnerOfferedExtras } =
        await import("@/lib/server/extras-store");
      let hydrated = await hydrateListingExtras(fileCar.extras);
      hydrated = await applyPartnerExtraOfferModes(hydrated, fileCar.partnerId, carId);
      hydrated = await mergePartnerOfferedExtras(hydrated, fileCar.partnerId, carId);
      return hydrated
        .filter((e) => !e.forbidden && e.extraService?.isActive !== false)
        .filter((e) => pickServiceLabel(localizedLabel(e.extraService?.name, "")))
        .map((e) => ({
          id: e.extraServiceId,
          label: pickServiceLabel(localizedLabel(e.extraService?.name, "")),
          priceEurPerDay: Number(e.priceEur) || 0,
          locked: e.extraService ? isMandatoryExtra(e.extraService) : false,
          maxPeriodEur: e.extraService?.maxPeriodEur ?? null,
          minPeriodEur: e.extraService?.minPeriodEur ?? null,
        }));
    }
  } catch {
    /* fall through */
  }

  try {
    const rows = await prisma.carExtra.findMany({
      where: { carId },
      include: {
        extraService: {
          select: {
            name: true,
            isTpl: true,
            minPriceEur: true,
            maxPriceEur: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { extraService: { sortOrder: "asc" } },
    });
    const { listExtraServices } = await import("@/lib/server/extras-store");
    const { effectivePeriodBounds } = await import("@/lib/extras/pricing");
    const { readPartnerExtraPrefs } = await import("@/lib/server/partner-extras-prefs-store");
    const caps = new Map(
      (await listExtraServices({ activeOnly: false })).map((service) => [
        service.id,
        service.maxPeriodEur,
      ]),
    );
    const owner = await prisma.car.findUnique({
      where: { id: carId },
      select: { partnerId: true },
    });
    const prefs = owner?.partnerId ? await readPartnerExtraPrefs(owner.partnerId) : [];
    const prefById = new Map(prefs.map((pref) => [pref.extraServiceId, pref]));
    return rows.flatMap((r) => {
      const label = pickServiceLabel(localizedLabel(r.extraService?.name, ""));
      if (!label) return [];
      const pref = prefById.get(r.extraServiceId);
      const usePref = Boolean(pref?.enabled) && !pref?.forbidden;
      const bounds = effectivePeriodBounds(
        caps.get(r.extraServiceId) ?? null,
        usePref ? pref?.maxPeriodEur : null,
        usePref ? pref?.minPeriodEur : null,
      );
      return [{
        id: r.extraServiceId,
        label,
        priceEurPerDay: usePref ? Number(pref?.priceEur) || Number(r.priceEur) || 0 : Number(r.priceEur) || 0,
        maxPeriodEur: bounds.maxPeriodEur,
        minPeriodEur: bounds.minPeriodEur,
        locked: r.extraService
          ? isMandatoryExtra({
              isTpl: r.extraService.isTpl,
              minPriceEur: r.extraService.minPriceEur == null ? null : Number(r.extraService.minPriceEur),
              maxPriceEur: r.extraService.maxPriceEur == null ? null : Number(r.extraService.maxPriceEur),
            })
          : false,
      }];
    });
  } catch {
    return [];
  }
}

/** Re-attach admin-mandatory / TPL extras if a client tried to strip them on save. */
export async function mergeMandatoryCatalogExtras(
  carId: string,
  proposed: Array<{ id: string; label: string; priceEur: number; qty?: number }>,
  rentalDays: number,
): Promise<Array<{ id: string; label: string; priceEur: number; qty?: number }>> {
  const catalog = await catalogExtrasForCar(carId);
  const days = Math.max(1, Math.floor(Number(rentalDays) || 1));
  const out = [...proposed];
  for (const ex of catalog) {
    if (!ex.locked) continue;
    if (out.some((e) => e.id === ex.id)) continue;
    out.push({
      id: ex.id,
      label: ex.label,
      priceEur: roundMoney(
        extraPeriodCharge(Number(ex.priceEurPerDay) || 0, days, 1, ex.maxPeriodEur, ex.minPeriodEur),
      ),
    });
  }
  return out;
}
