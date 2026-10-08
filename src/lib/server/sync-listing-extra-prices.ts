import "server-only";

import { revalidatePath } from "next/cache";
import { descriptionWithCabinetPrices } from "@/lib/cars/car-details";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCarsForPartner, updateFileCar } from "@/lib/server/partner-cars-store";
import { clearPublicCarPayloadCache } from "@/lib/server/public-car-payload";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

type CabinetPrice = {
  extraServiceId: string;
  slug?: string;
  name?: string;
  priceEur: number;
};

function sameMoney(a: number, b: number) {
  return Math.abs(a - b) < 0.001;
}

function priceFor(prices: CabinetPrice[], id: string, slug?: string | null): number | null {
  const direct = prices.find((price) => price.extraServiceId === id);
  if (direct) return direct.priceEur;
  const resolved = String(slug || "").trim();
  if (!resolved) return null;
  const bySlug = prices.find((price) => price.slug === resolved);
  return bySlug ? bySlug.priceEur : null;
}

function publishFreshListings() {
  clearPublicCarPayloadCache();
  revalidatePublishedContent();
  try {
    revalidatePath("/cars", "layout");
  } catch (error) {
    console.warn("[extras price sync] revalidate /cars", error);
  }
}

/** Copy cabinet daily prices onto every listing of this partner and drop public caches. */
export async function syncListingExtraPrices(input: {
  carIds: string[];
  prices: CabinetPrice[];
  userId: string;
  email?: string | null;
  partnerId: string;
}): Promise<void> {
  const prices = input.prices.filter((price) => Number.isFinite(Number(price.priceEur)));
  const carIds = [...new Set(input.carIds.map((id) => String(id || "").trim()).filter(Boolean))];

  try {
    if (carIds.length && prices.length) {
      try {
        const [extras, cars] = await Promise.all([
          prisma.carExtra.findMany({
            where: { carId: { in: carIds } },
            select: {
              id: true,
              extraServiceId: true,
              priceEur: true,
              extraService: { select: { slug: true } },
            },
          }),
          prisma.car.findMany({
            where: { id: { in: carIds } },
            select: { id: true, description: true },
          }),
        ]);
        const extraWrites = extras.flatMap((row) => {
          const next = priceFor(prices, row.extraServiceId, row.extraService?.slug);
          if (next == null || sameMoney(Number(row.priceEur), next)) return [];
          return [prisma.carExtra.update({ where: { id: row.id }, data: { priceEur: next } })];
        });
        const descriptionWrites = cars.flatMap((car) => {
          const description = descriptionWithCabinetPrices(car.description, prices);
          if (!description || description === car.description) return [];
          return [prisma.car.update({ where: { id: car.id }, data: { description } })];
        });
        const writes = [...extraWrites, ...descriptionWrites];
        if (writes.length) await prisma.$transaction(writes);
      } catch (error) {
        if (!isDbOfflineError(error)) {
          console.warn("[extras price sync] database", error);
        }
      }

      const fileCars = await listFileCarsForPartner({
        userId: input.userId,
        email: input.email,
        partnerId: input.partnerId,
      });
      for (const car of fileCars) {
        const extras = (car.extras || []).map((row) => {
          const next = priceFor(prices, row.extraServiceId);
          if (next == null || sameMoney(Number(row.priceEur) || 0, next)) return row;
          return { ...row, priceEur: next };
        });
        const description = descriptionWithCabinetPrices(car.description, prices);
        const extrasChanged = extras.some((row, index) => row !== car.extras?.[index]);
        const descriptionChanged = description != null && description !== car.description;
        if (!extrasChanged && !descriptionChanged) continue;
        await updateFileCar(car.id, {
          ...(extrasChanged ? { extras } : {}),
          ...(descriptionChanged && description ? { description } : {}),
        });
      }
    }
  } finally {
    publishFreshListings();
  }
}
