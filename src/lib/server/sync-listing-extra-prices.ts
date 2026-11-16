import "server-only";

import { revalidatePath } from "next/cache";
import {
  descriptionWithCabinetPrices,
  extrasModerationChange,
  type CabinetExtraSync,
} from "@/lib/cars/car-details";
import {
  hiddenReasonAfterPartnerEdit,
  PARTNER_EDIT_REMODERATION_REASON,
} from "@/lib/cars/listing-visibility";
import { partnerExtraPrefAppliesToCar } from "@/lib/extras/partner-extra-pref";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCarsForPartner, updateFileCar } from "@/lib/server/partner-cars-store";
import { clearPublicCarPayloadCache, clearPublicCarCache } from "@/lib/server/public-car-payload";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";
import { clearSearchCatalog } from "@/lib/server/search-catalog";

export type CabinetListingExtraSync = CabinetExtraSync & {
  carIds?: string[];
  /** Mandatory / TPL rows stay on the car even when cabinet mode is Off. */
  keepRow?: boolean;
};

function sameMoney(a: number, b: number) {
  return Math.abs(a - b) < 0.001;
}

function priceFor(prices: CabinetExtraSync[], id: string, slug?: string | null): number | null {
  const direct = prices.find((price) => price.extraServiceId === id);
  if (direct) return direct.forbidden ? 0 : direct.priceEur;
  const resolved = String(slug || "").trim();
  if (!resolved) return null;
  const bySlug = prices.find((price) => price.slug === resolved);
  return bySlug ? (bySlug.forbidden ? 0 : bySlug.priceEur) : null;
}

function pricesForCar(prices: CabinetListingExtraSync[], carId: string): CabinetListingExtraSync[] {
  return prices.filter((price) =>
    partnerExtraPrefAppliesToCar(
      { carIds: price.carIds, enabled: price.enabled, forbidden: price.forbidden },
      carId,
    ),
  );
}

function publishFreshListings(carIds?: string[]) {
  if (carIds?.length) {
    for (const id of carIds) clearPublicCarCache(id);
  } else {
    clearPublicCarPayloadCache();
  }
  clearSearchCatalog();
  revalidatePublishedContent();
  try {
    revalidatePath("/cars", "layout");
  } catch (error) {
    console.warn("[extras price sync] revalidate /cars", error);
  }
}

async function markDbListingRemoderation(input: {
  carId: string;
  previousStatus: string;
  previousReason?: string | null;
  before: {
    title: string;
    description: string | null;
    dailyRateEur: number;
    discountPercent?: number;
    make?: string;
    model?: string;
    year?: number | null;
    registrationNumber?: string | null;
    seats?: number | null;
    doors?: number | null;
    fuelType?: string | null;
    transmission?: string | null;
    photoUrls?: string[];
    passportFrontUrl?: string | null;
    passportBackUrl?: string | null;
  };
  afterDescription: string;
  beforeExtras: Array<{
    extraServiceId?: string;
    forbidden?: boolean;
    extraService?: { name?: unknown };
  }>;
}): Promise<void> {
  const { recordPartnerListingEditDiff, liveInputFromCarFields } = await import(
    "@/lib/server/car-listing-edit-diff"
  );
  const beforeLive = liveInputFromCarFields(input.before);
  const extrasChange = extrasModerationChange(
    input.before.description,
    input.beforeExtras,
    input.afterDescription,
  );
  await recordPartnerListingEditDiff({
    carId: input.carId,
    previousStatus: input.previousStatus,
    before: beforeLive,
    afterLive: {
      ...beforeLive,
      description: input.afterDescription,
    },
    extrasChange,
  });
  const nextStatus = "PENDING_REMODERATION";
  await prisma.car.update({
    where: { id: input.carId },
    data: {
      status: nextStatus,
      hiddenReason:
        hiddenReasonAfterPartnerEdit({
          prevStatus: input.previousStatus,
          prevReason: input.previousReason,
          nextStatus,
        }) || PARTNER_EDIT_REMODERATION_REASON,
    },
  });
}

/**
 * Copy cabinet daily prices and offer modes onto every listing of this partner,
 * add/remove CarExtra rows to match On/Forbidden/Off, and send changed APPROVED
 * listings back to re-moderation so search only shows them after admin approval.
 * Partner cabinet and admin review always read the live prefs.
 */
export async function syncListingExtraPrices(input: {
  carIds: string[];
  prices: CabinetListingExtraSync[];
  userId: string;
  email?: string | null;
  partnerId: string;
  /** Remoderate APPROVED cars even when the description blob was already up to date. */
  forceRemoderation?: boolean;
  /**
   * Partner cabinet saves send changed APPROVED listings to re-moderation (default).
   * Fleet maintenance resyncs set this false so every car is not queued for review.
   */
  remoderate?: boolean;
}): Promise<{ updated: number; remoderated: number }> {
  const prices = input.prices.filter((price) => Number.isFinite(Number(price.priceEur)));
  const carIds = [...new Set(input.carIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const allowRemoderation = input.remoderate !== false;
  let updated = 0;
  let remoderated = 0;
  const touched = new Set<string>();

  try {
    if (carIds.length && prices.length) {
      try {
        const [extras, cars] = await Promise.all([
          prisma.carExtra.findMany({
            where: { carId: { in: carIds } },
            select: {
              id: true,
              carId: true,
              extraServiceId: true,
              priceEur: true,
              extraService: { select: { slug: true, name: true } },
            },
          }),
          prisma.car.findMany({
            where: { id: { in: carIds } },
            select: {
              id: true,
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
              status: true,
              hiddenReason: true,
              photos: { orderBy: { sortOrder: "asc" }, select: { url: true } },
              passport: { select: { frontUrl: true, backUrl: true } },
            },
          }),
        ]);
        const extrasByCar = new Map<string, typeof extras>();
        for (const row of extras) {
          const list = extrasByCar.get(row.carId) || [];
          list.push(row);
          extrasByCar.set(row.carId, list);
        }

        for (const car of cars) {
          const scoped = pricesForCar(prices, car.id);
          // Only listings this cabinet row applies to — not the whole fleet by accident.
          if (!scoped.length) continue;

          const beforeExtras = extrasByCar.get(car.id) || [];
          const byExtraId = new Map(beforeExtras.map((row) => [row.extraServiceId, row]));
          const description = scoped.length
            ? descriptionWithCabinetPrices(car.description, scoped) || car.description
            : car.description;
          const descriptionChanged = Boolean(description && description !== car.description);

          const priceUpdates: Array<{ id: string; priceEur: number }> = [];
          const createRows: Array<{ carId: string; extraServiceId: string; priceEur: number }> = [];
          const deleteIds: string[] = [];

          for (const pref of scoped) {
            const existing = byExtraId.get(pref.extraServiceId);
            const offered = Boolean(pref.forbidden) || pref.enabled !== false;
            if (!offered) {
              if (existing && !pref.keepRow) deleteIds.push(existing.id);
              continue;
            }
            const nextPrice = pref.forbidden ? 0 : Number(pref.priceEur) || 0;
            if (!existing) {
              createRows.push({
                carId: car.id,
                extraServiceId: pref.extraServiceId,
                priceEur: nextPrice,
              });
              continue;
            }
            if (sameMoney(Number(existing.priceEur), nextPrice)) continue;
            priceUpdates.push({ id: existing.id, priceEur: nextPrice });
          }

          const extrasChanged =
            priceUpdates.length > 0 || createRows.length > 0 || deleteIds.length > 0;
          const changed = descriptionChanged || extrasChanged;
          const shouldRemoderate =
            allowRemoderation &&
            car.status === "APPROVED" &&
            (changed || Boolean(input.forceRemoderation));

          if (!changed && !shouldRemoderate) continue;

          if (changed) {
            await prisma.$transaction(async (tx) => {
              for (const row of priceUpdates) {
                await tx.carExtra.update({
                  where: { id: row.id },
                  data: { priceEur: row.priceEur },
                });
              }
              if (deleteIds.length) {
                await tx.carExtra.deleteMany({ where: { id: { in: deleteIds } } });
              }
              if (createRows.length) {
                await tx.carExtra.createMany({ data: createRows, skipDuplicates: true });
              }
              if (descriptionChanged && description) {
                await tx.car.update({
                  where: { id: car.id },
                  data: { description },
                });
              }
            });
            updated += 1;
            touched.add(car.id);
          }

          if (shouldRemoderate) {
            try {
              await markDbListingRemoderation({
                carId: car.id,
                previousStatus: car.status,
                previousReason: car.hiddenReason,
                before: {
                  title: car.title,
                  description: car.description,
                  dailyRateEur: Number(car.dailyRateEur) || 0,
                  discountPercent: Number(car.discountPercent) || 0,
                  make: car.make,
                  model: car.model,
                  year: car.year,
                  registrationNumber: car.registrationNumber,
                  seats: car.seats,
                  doors: car.doors,
                  fuelType: car.fuelType,
                  transmission: car.transmission,
                  photoUrls: (car.photos || []).map((p) => p.url).filter(Boolean),
                  passportFrontUrl: car.passport?.frontUrl || null,
                  passportBackUrl: car.passport?.backUrl || null,
                },
                afterDescription: description || car.description || "",
                beforeExtras,
              });
              remoderated += 1;
              touched.add(car.id);
            } catch (error) {
              console.warn("[extras price sync] remoderation", car.id, error);
            }
          }
        }
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
        if (carIds.length && !carIds.includes(car.id)) continue;
        const scoped = pricesForCar(prices, car.id);
        if (!scoped.length) continue;

        const beforeExtras = car.extras || [];
        let extras = [...beforeExtras];
        let extrasChanged = false;
        for (const pref of scoped) {
          const index = extras.findIndex((row) => row.extraServiceId === pref.extraServiceId);
          const offered = Boolean(pref.forbidden) || pref.enabled !== false;
          if (!offered) {
            if (index >= 0 && !pref.keepRow) {
              extras = extras.filter((_, i) => i !== index);
              extrasChanged = true;
            }
            continue;
          }
          const nextPrice = pref.forbidden ? 0 : Number(pref.priceEur) || 0;
          const nextForbidden = Boolean(pref.forbidden);
          if (index < 0) {
            extras.push({
              extraServiceId: pref.extraServiceId,
              priceEur: nextPrice,
              ...(nextForbidden ? { forbidden: true as const } : {}),
            });
            extrasChanged = true;
            continue;
          }
          const row = extras[index];
          if (
            sameMoney(Number(row.priceEur) || 0, nextPrice) &&
            Boolean(row.forbidden) === nextForbidden
          ) {
            continue;
          }
          extras[index] = {
            extraServiceId: row.extraServiceId,
            priceEur: nextPrice,
            ...(nextForbidden ? { forbidden: true as const } : {}),
          };
          extrasChanged = true;
        }

        const description = scoped.length
          ? descriptionWithCabinetPrices(car.description, scoped)
          : car.description;
        const descriptionChanged = description != null && description !== car.description;
        const changed = extrasChanged || descriptionChanged;
        const shouldRemoderate =
          allowRemoderation &&
          car.status === "APPROVED" &&
          (changed || Boolean(input.forceRemoderation));
        if (!changed && !shouldRemoderate) continue;

        const patch: Parameters<typeof updateFileCar>[1] = {
          ...(extrasChanged ? { extras } : {}),
          ...(descriptionChanged && description ? { description } : {}),
        };

        if (shouldRemoderate) {
          const { recordPartnerListingEditDiff, liveInputFromCarFields } = await import(
            "@/lib/server/car-listing-edit-diff"
          );
          const beforeLive = liveInputFromCarFields({
            title: car.title,
            description: car.description,
            dailyRateEur: car.dailyRateEur,
            discountPercent: 0,
            make: car.make,
            model: car.model,
            year: car.year,
            registrationNumber: car.registrationNumber,
            seats: car.seats,
            doors: car.doors,
            fuelType: car.fuelType,
            transmission: car.transmission,
            photoUrls: car.photos || [],
            passportFrontUrl: car.passportFrontUrl,
            passportBackUrl: car.passportBackUrl,
          });
          const afterDescription = description || car.description || "";
          await recordPartnerListingEditDiff({
            carId: car.id,
            previousStatus: car.status,
            before: beforeLive,
            afterLive: { ...beforeLive, description: afterDescription },
            extrasChange: extrasModerationChange(car.description, beforeExtras, afterDescription),
          });
          patch.status = "PENDING_REMODERATION";
          patch.hiddenReason = PARTNER_EDIT_REMODERATION_REASON;
          remoderated += 1;
        }

        if (Object.keys(patch).length && (await updateFileCar(car.id, patch))) {
          updated += 1;
          touched.add(car.id);
        }
      }
    }
  } finally {
    publishFreshListings([...touched]);
  }
  return { updated, remoderated };
}
