import { parseCarDetails, type CarDetailsBlob } from "@/lib/cars/car-details";
import { diffCarAgainstPublished } from "@/lib/cars/car-published-diff";
import {
  ensurePublishedCarSnapshot,
  writeCarFieldChanges,
  type PublishedCarLiveInput,
  type PublishedCarSnapshot,
} from "@/lib/server/car-published-store";

export function liveInputFromCarFields(input: {
  title?: unknown;
  description?: unknown;
  dailyRateEur?: unknown;
  discountPercent?: unknown;
  make?: unknown;
  model?: unknown;
  year?: unknown;
  registrationNumber?: unknown;
  seats?: unknown;
  doors?: unknown;
  fuelType?: unknown;
  transmission?: unknown;
  photoUrls?: string[];
  passportFrontUrl?: string | null;
  passportBackUrl?: string | null;
  insuranceUrl?: string | null;
}): PublishedCarLiveInput {
  return {
    title: String(input.title || ""),
    description: String(input.description || ""),
    dailyRateEur: Number(input.dailyRateEur) || 0,
    discountPercent: Number(input.discountPercent) || 0,
    make: input.make != null ? String(input.make) : "",
    model: input.model != null ? String(input.model) : "",
    year: input.year as number | string | null | undefined,
    registrationNumber: input.registrationNumber != null ? String(input.registrationNumber) : "",
    seats: input.seats as number | string | null | undefined,
    doors: input.doors as number | string | null | undefined,
    fuelType: input.fuelType != null ? String(input.fuelType) : "",
    transmission: input.transmission != null ? String(input.transmission) : "",
    photoUrls: Array.isArray(input.photoUrls) ? input.photoUrls.map(String).filter(Boolean) : [],
    passportFrontUrl: input.passportFrontUrl != null ? String(input.passportFrontUrl) : "",
    passportBackUrl: input.passportBackUrl != null ? String(input.passportBackUrl) : "",
    insuranceUrl: input.insuranceUrl != null ? String(input.insuranceUrl) : "",
  };
}

/** Freeze first baseline (if missing), then persist field diffs for admin red highlights. */
export async function recordPartnerListingEditDiff(input: {
  carId: string;
  before: PublishedCarLiveInput;
  afterLive: PublishedCarLiveInput;
  afterDetails?: CarDetailsBlob | null;
}): Promise<{ snapshot: PublishedCarSnapshot; changeCount: number }> {
  const snapshot = await ensurePublishedCarSnapshot(input.carId, input.before);
  const details =
    input.afterDetails !== undefined
      ? input.afterDetails
      : parseCarDetails(input.afterLive.description);
  const changes = diffCarAgainstPublished({
    live: {
      make: input.afterLive.make,
      model: input.afterLive.model,
      year: input.afterLive.year,
      registrationNumber: input.afterLive.registrationNumber,
      seats: input.afterLive.seats,
      doors: input.afterLive.doors,
      fuelType: input.afterLive.fuelType,
      transmission: input.afterLive.transmission,
      dailyRateEur: input.afterLive.dailyRateEur,
      description: input.afterLive.description,
      photoUrls: input.afterLive.photoUrls || [],
      passportFrontUrl: input.afterLive.passportFrontUrl || "",
      passportBackUrl: input.afterLive.passportBackUrl || "",
      insuranceUrl: input.afterLive.insuranceUrl || "",
    },
    details,
    snapshot,
  });
  await writeCarFieldChanges(input.carId, changes);
  return { snapshot, changeCount: changes.size };
}
