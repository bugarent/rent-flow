import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { parseCarDetails, type CarDetailsBlob } from "@/lib/cars/car-details";
import type { PartnerApiOwner } from "@/lib/server/partner-api-keys-store";

export type PartnerOwnedCar = {
  id: string;
  source: "db" | "file";
  make: string;
  model: string;
  year: number;
  title: string;
  registrationNumber: string;
  status: string;
  dailyRateEur: number;
  description: string;
  details: CarDetailsBlob | null;
  externalId: string;
};

function externalIdOf(details: CarDetailsBlob | null) {
  return String(details?.externalId || "").trim();
}

/** Every car the partner owns, from the database and the file store. */
export async function listPartnerOwnedCars(owner: PartnerApiOwner): Promise<PartnerOwnedCar[]> {
  const rows: PartnerOwnedCar[] = [];
  const seen = new Set<string>();

  if (owner.partnerId && !owner.partnerId.startsWith("file-partner-")) {
    try {
      const cars = await prisma.car.findMany({
        where: { partnerId: owner.partnerId },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          title: true,
          registrationNumber: true,
          status: true,
          dailyRateEur: true,
          description: true,
        },
      });
      for (const car of cars) {
        const details = parseCarDetails(car.description);
        seen.add(car.id);
        rows.push({
          id: car.id,
          source: "db",
          make: car.make,
          model: car.model,
          year: car.year,
          title: car.title,
          registrationNumber: String(car.registrationNumber || ""),
          status: String(car.status),
          dailyRateEur: Number(car.dailyRateEur) || 0,
          description: car.description || "",
          details,
          externalId: externalIdOf(details),
        });
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }
  }

  const fileCars = await listFileCarsForPartner({
    userId: owner.userId,
    email: owner.email,
    partnerId: owner.partnerId,
  });
  for (const car of fileCars) {
    if (seen.has(car.id)) continue;
    const details = parseCarDetails(car.description);
    rows.push({
      id: car.id,
      source: "file",
      make: car.make,
      model: car.model,
      year: car.year,
      title: car.title,
      registrationNumber: String(car.registrationNumber || ""),
      status: String(car.status),
      dailyRateEur: Number(car.dailyRateEur) || 0,
      description: car.description || "",
      details,
      externalId: externalIdOf(details),
    });
  }
  return rows;
}

/** Find by our car id or by the partner's own `external_id`. */
export async function findPartnerOwnedCar(owner: PartnerApiOwner, idOrExternal: string) {
  const key = idOrExternal.trim();
  if (!key) return null;
  const cars = await listPartnerOwnedCars(owner);
  return cars.find((car) => car.id === key) || cars.find((car) => car.externalId === key) || null;
}
