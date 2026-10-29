import "server-only";

import { revalidatePath } from "next/cache";
import { descriptionWithTariffRanges } from "@/lib/cars/car-details";
import type { TariffInterval } from "@/lib/partners/company-settings";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCarsForPartner, updateFileCar } from "@/lib/server/partner-cars-store";
import { clearPublicCarPayloadCache } from "@/lib/server/public-car-payload";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

/**
 * After a partner changes their tariff day ranges, re-key every listing's tier prices to those
 * ranges so search and checkout price trips by the new periods without re-saving each car.
 * Only the `pricingTiers` ranges inside the details blob change; prices keep their column.
 */
export async function syncListingTariffRanges(input: {
  partnerId: string;
  userId: string;
  email?: string | null;
  intervals: TariffInterval[];
}): Promise<{ updated: number }> {
  if (!input.intervals.length) return { updated: 0 };
  let updated = 0;

  try {
    if (!input.partnerId.startsWith("file-partner-")) {
      try {
        const cars = await prisma.car.findMany({
          where: { partnerId: input.partnerId },
          select: { id: true, description: true },
        });
        const writes = cars.flatMap((car) => {
          const description = descriptionWithTariffRanges(car.description, input.intervals);
          if (!description || description === car.description) return [];
          return [prisma.car.update({ where: { id: car.id }, data: { description } })];
        });
        if (writes.length) {
          await prisma.$transaction(writes);
          updated += writes.length;
        }
      } catch (error) {
        if (!isDbOfflineError(error)) console.warn("[tariff range sync] database", error);
      }
    }

    const fileCars = await listFileCarsForPartner({
      userId: input.userId,
      email: input.email,
      partnerId: input.partnerId,
    });
    for (const car of fileCars) {
      const description = descriptionWithTariffRanges(car.description, input.intervals);
      if (!description || description === car.description) continue;
      if (await updateFileCar(car.id, { description })) updated += 1;
    }
  } finally {
    if (updated) {
      clearPublicCarPayloadCache();
      revalidatePublishedContent();
      try {
        revalidatePath("/cars", "layout");
      } catch (error) {
        console.warn("[tariff range sync] revalidate /cars", error);
      }
    }
  }
  return { updated };
}
