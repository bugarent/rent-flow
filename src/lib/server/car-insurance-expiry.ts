import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listExpiredInsuranceCarIds } from "@/lib/server/car-insurance-store";
import { getFileCar, updateFileCar } from "@/lib/server/partner-cars-store";
import {
  ensurePublishedCarSnapshot,
  writeCarFieldChanges,
  readCarFieldChanges,
} from "@/lib/server/car-published-store";

const EXPIRY_REASON = "Insurance expired — awaiting re-moderation";

async function markFileCarExpired(carId: string): Promise<boolean> {
  const car = await getFileCar(carId);
  if (!car || car.status !== "APPROVED") return false;
  await updateFileCar(carId, {
    status: "PENDING_REMODERATION",
    hiddenReason: EXPIRY_REASON,
  });
  try {
    await ensurePublishedCarSnapshot(carId, {
      title: car.title,
      description: car.description || "",
      dailyRateEur: car.dailyRateEur,
      discountPercent: 0,
      make: car.make,
      model: car.model,
      year: car.year,
      registrationNumber: car.registrationNumber || "",
      seats: car.seats,
      doors: car.doors,
      fuelType: car.fuelType,
      transmission: car.transmission,
      photoUrls: car.photos || [],
      passportFrontUrl: car.passportFrontUrl || "",
      passportBackUrl: car.passportBackUrl || "",
      insuranceUrl: "",
    });
    const existing = (await readCarFieldChanges(carId)) || {};
    await writeCarFieldChanges(carId, {
      ...existing,
      insuranceExpiresAt: { previous: "valid" },
    });
  } catch (error) {
    console.warn("[insurance-expiry] file snapshot", carId, error);
  }
  return true;
}

async function markPrismaCarExpired(carId: string): Promise<boolean> {
  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: {
        id: true,
        status: true,
        title: true,
        description: true,
        dailyRateEur: true,
        discountPercent: true,
        make: true,
        model: true,
        year: true,
        registrationNumber: true,
        seats: true,
        doors: true,
        fuelType: true,
        transmission: true,
        photos: { select: { url: true }, orderBy: { sortOrder: "asc" } },
        passport: { select: { frontUrl: true, backUrl: true } },
      },
    });
    if (!car || car.status !== "APPROVED") return false;
    await prisma.car.update({
      where: { id: carId },
      data: {
        status: "PENDING_REMODERATION",
        hiddenReason: EXPIRY_REASON,
      },
    });
    try {
      await ensurePublishedCarSnapshot(carId, {
        title: car.title,
        description: car.description || "",
        dailyRateEur: Number(car.dailyRateEur),
        discountPercent: Number(car.discountPercent) || 0,
        make: car.make,
        model: car.model,
        year: car.year,
        registrationNumber: car.registrationNumber || "",
        seats: car.seats,
        doors: car.doors,
        fuelType: car.fuelType,
        transmission: car.transmission,
        photoUrls: car.photos.map((p) => p.url),
        passportFrontUrl: car.passport?.frontUrl || "",
        passportBackUrl: car.passport?.backUrl || "",
        insuranceUrl: "",
      });
      const existing = (await readCarFieldChanges(carId)) || {};
      await writeCarFieldChanges(carId, {
        ...existing,
        insuranceExpiresAt: { previous: "valid" },
      });
    } catch (error) {
      console.warn("[insurance-expiry] prisma snapshot", carId, error);
    }
    return true;
  } catch (error) {
    if (isDbOfflineError(error)) return false;
    throw error;
  }
}

/**
 * Move APPROVED listings with reached insurance expiry into PENDING_REMODERATION
 * so they leave public search and show amber on the partner calendar.
 */
export async function applyExpiredInsuranceRemoderation(opts?: {
  carIds?: string[];
}): Promise<{ checked: number; remodeated: number }> {
  const expiredIds = await listExpiredInsuranceCarIds();
  const scope = opts?.carIds?.length
    ? expiredIds.filter((id) => opts.carIds!.includes(id))
    : expiredIds;
  let remodeated = 0;
  for (const carId of scope) {
    const fileOk = await markFileCarExpired(carId).catch((error) => {
      console.warn("[insurance-expiry] file", carId, error);
      return false;
    });
    if (fileOk) {
      remodeated += 1;
      continue;
    }
    const prismaOk = await markPrismaCarExpired(carId).catch((error) => {
      console.warn("[insurance-expiry] prisma", carId, error);
      return false;
    });
    if (prismaOk) remodeated += 1;
  }
  return { checked: scope.length, remodeated };
}
