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
  const { isMandatoryFreeExtra } = await import("@/lib/extras/pricing");
  const { isCoreTplSlug } = await import("@/lib/extras/tpl-partner-choice");
  const { hydratePartnerListingExtras } = await import("@/lib/server/extras-store");

  async function shape(
    hydrated: Awaited<ReturnType<typeof hydratePartnerListingExtras>>,
    partnerId?: string | null,
  ) {
    let canToggleTpl = false;
    try {
      if (partnerId) {
        const { partnerMayToggleTpl } = await import("@/lib/server/tpl-partner-choice-store");
        canToggleTpl = await partnerMayToggleTpl(partnerId);
      }
    } catch {
      canToggleTpl = false;
    }
    return hydrated
      .filter((e) => !e.forbidden && e.extraService?.isActive !== false)
      .filter((e) => pickServiceLabel(localizedLabel(e.extraService?.name, "")))
      .map((e) => {
        const slug = e.extraService?.slug;
        const mandatoryFree = e.extraService ? isMandatoryFreeExtra(e.extraService) : false;
        return {
          id: e.extraServiceId,
          label: pickServiceLabel(localizedLabel(e.extraService?.name, "")),
          priceEurPerDay: Number(e.priceEur) || 0,
          // Optional-country TPL is not locked when the partner may turn it Off.
          locked: mandatoryFree && !(canToggleTpl && isCoreTplSlug(slug)),
          maxPeriodEur: e.extraService?.maxPeriodEur ?? null,
          minPeriodEur: e.extraService?.minPeriodEur ?? null,
        };
      });
  }

  try {
    const fileCar = await getFileCar(carId);
    if (fileCar?.extras?.length) {
      const hydrated = await hydratePartnerListingExtras({
        rawExtras: fileCar.extras,
        partnerId: fileCar.partnerId,
        carId,
        description: fileCar.description,
      });
      return shape(hydrated, fileCar.partnerId);
    }
  } catch {
    /* fall through */
  }

  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: {
        partnerId: true,
        description: true,
        extras: {
          select: {
            extraServiceId: true,
            priceEur: true,
          },
        },
      },
    });
    if (!car) return [];
    // Ids only — hydrate attaches catalog rows (incl. checkout slot) and applies Off prefs.
    const hydrated = await hydratePartnerListingExtras({
      rawExtras: car.extras.map((row) => ({
        extraServiceId: row.extraServiceId,
        priceEur: Number(row.priceEur) || 0,
      })),
      partnerId: car.partnerId,
      carId,
      description: car.description,
    });
    return shape(hydrated, car.partnerId);
  } catch {
    return [];
  }
}

/** Re-attach the free TPL pack if a client tried to strip it on save. */
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
