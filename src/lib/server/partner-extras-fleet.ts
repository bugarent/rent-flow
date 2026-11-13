import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { parseCarDetails, readExtraOffers } from "@/lib/cars/car-details";

export type PartnerExtrasFleetCar = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  categorySlug: string | null;
  registrationNumber: string | null;
};

/** The partner's cars for the services pages, and which services those cars already offer. */
export async function listPartnerCarsForExtras(
  session: { user: { id: string; email?: string | null } },
  partnerId: string,
): Promise<{
  cars: PartnerExtrasFleetCar[];
  usedOnCar: (service: { id: string; slug?: string }) => boolean;
}> {
  const cars: PartnerExtrasFleetCar[] = [];
  const seen = new Set<string>();
  /** Services already offered on a car (rows or saved offers), by id and by slug. */
  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();
  const noteOffers = (details: ReturnType<typeof parseCarDetails>) => {
    for (const offer of readExtraOffers(details)) {
      if (offer.enabled === false && !offer.forbidden) continue;
      usedIds.add(offer.extraServiceId);
      if (offer.slug) usedSlugs.add(offer.slug);
    }
  };

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
          extras: { select: { extraServiceId: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      for (const c of dbCars) {
        seen.add(c.id);
        const details = parseCarDetails(c.description);
        for (const row of c.extras) usedIds.add(row.extraServiceId);
        noteOffers(details);
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
    for (const row of c.extras || []) if (row?.extraServiceId) usedIds.add(row.extraServiceId);
    noteOffers(details);
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

  return {
    cars,
    usedOnCar: (service) =>
      usedIds.has(service.id) || Boolean(service.slug && usedSlugs.has(service.slug)),
  };
}
