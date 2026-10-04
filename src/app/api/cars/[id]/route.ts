import { NextResponse } from "next/server";
import { getAdminSession, getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { MIN_PUBLIC_PHOTOS } from "@/lib/brand";
import {
  normalizePartnerExtraPrice,
  type PartnerExtraInput,
} from "@/lib/extras/pricing";
import { resolvePartnerDeliveryPrices } from "@/lib/delivery/pricing";
import { listPartnerScopedDeliveryLocations } from "@/lib/server/delivery-locations";
import { persistCarInsuranceDocument } from "@/lib/server/car-passport-docs";
import {
  normalizeInsuranceExpiresAt,
  normalizeInsuranceUrl,
  readCarInsuranceDoc,
  readCarInsuranceUrl,
} from "@/lib/server/car-insurance-store";
import { ensureExtrasExistInDb, listExtraServices } from "@/lib/server/extras-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  deleteFileCar,
  fileCarToApiShape,
  getFileCar,
  isFileCarOwner,
  isPublicFileCarStatus,
  updateFileCar,
} from "@/lib/server/partner-cars-store";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/cars/registration-number";
import {
  normalizePartnerCategorySlug,
  resolveCategorySlugForCar,
} from "@/lib/server/category-mapping";
import {
  clearPublicCarCache,
  enrichPublicCarPayload,
  loadPublicCarPayload,
  PUBLIC_CAR_INCLUDE,
  shapeFileCarForApi,
} from "@/lib/server/public-car-payload";

async function resolveCarExtras(rawExtras: unknown) {
  const catalog = await listExtraServices({ activeOnly: true });
  await ensureExtrasExistInDb(catalog);
  const inputs = Array.isArray(rawExtras) ? (rawExtras as PartnerExtraInput[]) : [];
  const inputById = new Map(inputs.map((i) => [i.extraServiceId, i]));

  const rows: Array<{ extraServiceId: string; priceEur: number; forbidden?: boolean }> = [];
  for (const service of catalog) {
    const input = inputById.get(service.id) ?? {
      extraServiceId: service.id,
      enabled: service.mode !== "toggle",
      priceEur: service.defaultPriceEur,
    };
    if (service.mode === "free" || service.isTpl) {
      rows.push({ extraServiceId: service.id, priceEur: 0 });
      continue;
    }
    const normalized = normalizePartnerExtraPrice(service, input);
    if (normalized) rows.push(normalized);
  }
  return rows;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [partnerSession, adminSession] = await Promise.all([getPartnerSession(), getAdminSession()]);
  const isAdmin = adminSession?.user.role === "ADMIN";
  const isVendor = partnerSession?.user.role === "VENDOR";
  const url = new URL(req.url);
  const rangeFrom = String(url.searchParams.get("startDate") || "").slice(0, 10);
  const rangeTo = String(url.searchParams.get("endDate") || rangeFrom).slice(0, 10);

  if (!partnerSession && !adminSession) {
    const publicCar = await loadPublicCarPayload(id, { rangeFrom, rangeTo });
    if (!publicCar) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(publicCar);
  }

  async function withPublishedSnapshotForAdmin<T extends object>(
    payload: T,
  ): Promise<T & { publishedSnapshot?: unknown; fieldChanges?: unknown }> {
    if (!isAdmin) return payload;
    try {
      const { readPublishedCarSnapshot, readCarFieldChanges } = await import(
        "@/lib/server/car-published-store"
      );
      const carKey = String(("id" in payload && payload.id) || id);
      const [snapshot, fieldChanges] = await Promise.all([
        readPublishedCarSnapshot(carKey),
        readCarFieldChanges(carKey),
      ]);
      return {
        ...payload,
        ...(snapshot ? { publishedSnapshot: snapshot } : {}),
        ...(fieldChanges && Object.keys(fieldChanges).length ? { fieldChanges } : {}),
      };
    } catch {
      return payload;
    }
  }

  async function enrichPublicCar<T extends object>(payload: T, partnerIdHint?: string) {
    return enrichPublicCarPayload(payload, {
      carId: id,
      partnerIdHint,
      rangeFrom,
      rangeTo,
    });
  }

  let car: any = null;
  try {
    car = await prisma.car.findUnique({
      where: { id },
      include: {
        ...PUBLIC_CAR_INCLUDE,
        ...(isAdmin || isVendor ? { passport: true } : {}),
      },
    });
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  if (!car) {
    const fileCar = await getFileCar(id);
    if (!fileCar) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isOwner = isFileCarOwner(fileCar, partnerSession?.user);
    const publicOk = isPublicFileCarStatus(fileCar.status);
    if (!publicOk && !isAdmin && !isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const insuranceDoc = await readCarInsuranceDoc(id);
    const shaped = await shapeFileCarForApi(
      fileCar,
      insuranceDoc?.insuranceUrl || null,
      insuranceDoc?.insuranceExpiresAt || null,
    );
    const payload = await enrichPublicCar(shaped, fileCar.partnerId);
    if (!isAdmin && !isOwner) {
      const { passport: _passport, insuranceUrl: _insurance, ...publicPayload } = payload;
      return NextResponse.json(publicPayload);
    }
    return NextResponse.json(await withPublishedSnapshotForAdmin(payload));
  }

  const isOwner = Boolean(partnerSession?.user && car.partner?.userId === partnerSession.user.id);
  const publicOk = car.status === "APPROVED";
  if (!publicOk && !isAdmin && !isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAdmin && !isOwner) {
    const { passport: _passport, ...publicCar } = car as typeof car & { passport?: unknown };
    return NextResponse.json(await enrichPublicCar(publicCar, car.partner?.id));
  }
  const insuranceDoc = await readCarInsuranceDoc(id);
  const insuranceUrl = insuranceDoc?.insuranceUrl || null;
  const insuranceExpiresAt = insuranceDoc?.insuranceExpiresAt || null;
  const rejection = await (async () => {
    try {
      const { readCarRejectionNotice } = await import("@/lib/server/car-rejection-store");
      return await readCarRejectionNotice(id);
    } catch {
      return null;
    }
  })();
  if (car && "passport" in car && car.passport) {
    return NextResponse.json(
      await withPublishedSnapshotForAdmin(
        await enrichPublicCar(
          {
            ...car,
            passport: {
              ...car.passport,
              insuranceUrl: insuranceUrl || null,
              insuranceExpiresAt: insuranceExpiresAt || null,
            },
            insuranceUrl: insuranceUrl || null,
            insuranceExpiresAt: insuranceExpiresAt || null,
            rejectionNotice: rejection,
          },
          car.partner?.id,
        ),
      ),
    );
  }
  return NextResponse.json(
    await withPublishedSnapshotForAdmin(
      await enrichPublicCar(
        {
          ...car,
          insuranceUrl: insuranceUrl || null,
          insuranceExpiresAt: insuranceExpiresAt || null,
          rejectionNotice: rejection,
        },
        car.partner?.id,
      ),
    ),
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const partnerSession = await getPartnerSession();
  const adminSession = await getAdminSession();
  if (!partnerSession && !adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  clearPublicCarCache(id);
  let car: any = null;
  try {
    car = await prisma.car.findUnique({
      where: { id },
      include: { partner: true, photos: true, passport: true },
    });
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  if (!car) {
    const fileCar = await getFileCar(id);
    if (!fileCar) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const fileOwner = isFileCarOwner(fileCar, partnerSession?.user);
    const fileAdmin = adminSession?.user.role === "ADMIN";
    if (!fileOwner && !fileAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const fileBody = await req.json();
    const photos: string[] | undefined = fileBody.photos ?? fileBody.images;
    if (fileOwner && !fileAdmin && photos && photos.length < MIN_PUBLIC_PHOTOS) {
      return NextResponse.json(
        { error: `At least ${MIN_PUBLIC_PHOTOS} public photos are required` },
        { status: 400 },
      );
    }
    const nextRegistration =
      fileBody.registrationNumber != null
        ? normalizeRegistrationNumber(String(fileBody.registrationNumber))
        : fileCar.registrationNumber;
    if (nextRegistration && !isValidRegistrationNumber(nextRegistration)) {
      return NextResponse.json({ error: "Invalid registration number" }, { status: 400 });
    }
    if (nextRegistration) {
      const { assertRegistrationAvailable, plateTakenResponse } = await import(
        "@/lib/server/assert-registration-available"
      );
      const check = await assertRegistrationAvailable(nextRegistration, { excludeId: id });
      if (!check.ok) {
        return NextResponse.json(plateTakenResponse(), { status: 409 });
      }
    }
    const { nextListingStatusAfterPartnerEdit } = await import("@/lib/server/car-published-store");
    const { liveInputFromCarFields, recordPartnerListingEditDiff } = await import(
      "@/lib/server/car-listing-edit-diff"
    );
    const nextStatus =
      fileAdmin && fileBody.status
        ? String(fileBody.status)
        : fileOwner
          ? nextListingStatusAfterPartnerEdit(fileCar.status)
          : fileCar.status;
    const insuranceBefore = await readCarInsuranceUrl(id);
    const beforeLive =
      fileOwner && !fileAdmin
        ? liveInputFromCarFields({
            title: fileCar.title,
            description: fileCar.description,
            dailyRateEur: fileCar.dailyRateEur,
            discountPercent: (fileCar as { discountPercent?: number }).discountPercent || 0,
            make: fileCar.make,
            model: fileCar.model,
            year: fileCar.year,
            registrationNumber: fileCar.registrationNumber || "",
            seats: fileCar.seats,
            doors: fileCar.doors,
            fuelType: fileCar.fuelType,
            transmission: fileCar.transmission,
            photoUrls: Array.isArray(fileCar.photos) ? fileCar.photos.map(String) : [],
            passportFrontUrl: fileCar.passportFrontUrl || "",
            passportBackUrl: fileCar.passportBackUrl || "",
            insuranceUrl: insuranceBefore || "",
          })
        : null;
    const nextMake = fileBody.make != null ? String(fileBody.make) : fileCar.make;
    const nextModel = fileBody.model != null ? String(fileBody.model) : fileCar.model;
    let nextCategorySlug = fileCar.categorySlug;
    if (Object.prototype.hasOwnProperty.call(fileBody, "categorySlug")) {
      const rawSlug = String(fileBody.categorySlug ?? "").trim();
      try {
        nextCategorySlug =
          (await normalizePartnerCategorySlug(rawSlug)) ||
          (await resolveCategorySlugForCar(nextMake, nextModel)) ||
          rawSlug ||
          null;
      } catch {
        nextCategorySlug = rawSlug || fileCar.categorySlug;
      }
    } else if (fileBody.make != null || fileBody.model != null) {
      try {
        nextCategorySlug =
          (await resolveCategorySlugForCar(nextMake, nextModel)) || fileCar.categorySlug;
      } catch {
        nextCategorySlug = fileCar.categorySlug;
      }
    }
    const updated = await updateFileCar(id, {
      title: fileBody.title ?? fileCar.title,
      description: fileBody.description ?? fileCar.description,
      dailyRateEur: fileBody.dailyRateEur != null ? Number(fileBody.dailyRateEur) : fileCar.dailyRateEur,
      make: nextMake,
      model: nextModel,
      year: fileBody.year != null ? Number(fileBody.year) : fileCar.year,
      seats: fileBody.seats != null ? Number(fileBody.seats) : fileCar.seats,
      doors: fileBody.doors != null ? Number(fileBody.doors) : fileCar.doors,
      transmission: fileBody.transmission != null ? String(fileBody.transmission) : fileCar.transmission,
      fuelType: fileBody.fuelType != null ? String(fileBody.fuelType) : fileCar.fuelType,
      registrationNumber: nextRegistration || null,
      categorySlug: nextCategorySlug,
      status: nextStatus as typeof fileCar.status,
      hiddenReason:
        nextStatus === "APPROVED"
          ? null
          : fileCar.status === "REJECTED" && fileCar.hiddenReason
            ? fileCar.hiddenReason
            : fileBody.hiddenReason ??
              (fileOwner && nextStatus === "PENDING_REMODERATION"
                ? "Partner edited listing — awaiting re-moderation"
                : fileCar.hiddenReason),
      photos: Array.isArray(photos) ? photos : fileCar.photos,
      passportFrontUrl: fileBody.passportFrontUrl ?? fileCar.passportFrontUrl,
      passportBackUrl: fileBody.passportBackUrl ?? fileCar.passportBackUrl,
      extras: Array.isArray(fileBody.extras)
        ? fileBody.extras
            .filter(
              (e: { enabled?: boolean; forbidden?: boolean }) =>
                e.forbidden === true || e.enabled !== false,
            )
            .map((e: { extraServiceId: string; priceEur?: number | null; forbidden?: boolean }) => ({
              extraServiceId: e.extraServiceId,
              priceEur: e.forbidden ? 0 : Number(e.priceEur ?? 0),
              ...(e.forbidden ? { forbidden: true as const } : {}),
            }))
        : fileCar.extras,
      deliveryPrices: Array.isArray(fileBody.deliveryPrices)
        ? fileBody.deliveryPrices
            .filter((d: { enabled?: boolean }) => d.enabled !== false)
            .map(
              (d: {
                deliveryLocationId: string;
                priceEur?: number | null;
                freeAfterDays?: number;
                travelTimeMinutes?: number;
              }) => ({
                deliveryLocationId: d.deliveryLocationId,
                priceEur: Number(d.priceEur ?? 0),
                freeAfterDays: Number(d.freeAfterDays ?? 0),
                travelTimeMinutes: Number(d.travelTimeMinutes ?? 0),
              }),
            )
        : fileCar.deliveryPrices,
    });
    if (Object.prototype.hasOwnProperty.call(fileBody, "insuranceUrl")) {
      const nextInsurance = normalizeInsuranceUrl(fileBody.insuranceUrl);
      if (!nextInsurance && fileCar.status !== "DRAFT" && !fileAdmin) {
        return NextResponse.json({ error: "Insurance document is required" }, { status: 400 });
      }
      await persistCarInsuranceDocument(id, fileBody.insuranceUrl);
    }
    if (Object.prototype.hasOwnProperty.call(fileBody, "insuranceExpiresAt")) {
      const nextExpiry = normalizeInsuranceExpiresAt(fileBody.insuranceExpiresAt);
      if (!nextExpiry && fileCar.status !== "DRAFT" && !fileAdmin) {
        return NextResponse.json({ error: "Insurance expiry date is required" }, { status: 400 });
      }
      await persistCarInsuranceDocument(id, undefined, fileBody.insuranceExpiresAt);
    }
    const insuranceDoc = await readCarInsuranceDoc(id);
    const insuranceUrl = insuranceDoc?.insuranceUrl || null;
    const insuranceExpiresAt = insuranceDoc?.insuranceExpiresAt || null;
    const saved = updated ?? fileCar;
    if (beforeLive) {
      try {
        const nextPhotos = Array.isArray(photos) ? photos.map(String) : saved.photos || [];
        await recordPartnerListingEditDiff({
          carId: id,
          before: beforeLive,
          afterLive: liveInputFromCarFields({
            title: saved.title,
            description: saved.description,
            dailyRateEur: saved.dailyRateEur,
            discountPercent: (saved as { discountPercent?: number }).discountPercent || 0,
            make: saved.make,
            model: saved.model,
            year: saved.year,
            registrationNumber: saved.registrationNumber || "",
            seats: saved.seats,
            doors: saved.doors,
            fuelType: saved.fuelType,
            transmission: saved.transmission,
            photoUrls: nextPhotos,
            passportFrontUrl: saved.passportFrontUrl || "",
            passportBackUrl: saved.passportBackUrl || "",
            insuranceUrl: insuranceUrl || "",
          }),
        });
      } catch (error) {
        console.error("[cars PATCH file] recordPartnerListingEditDiff", error);
      }
    }
    return NextResponse.json({
      ...fileCarToApiShape(saved, insuranceUrl, insuranceExpiresAt),
      deliveryAdjustments: [],
    });
  }

  const isOwner = Boolean(partnerSession && car.partner?.userId === partnerSession.user.id);
  const isAdmin = adminSession?.user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  if (isOwner && !isAdmin) {
    const photos: string[] | undefined = body.photos ?? body.images;
    if (photos && photos.length < MIN_PUBLIC_PHOTOS) {
      return NextResponse.json(
        { error: `At least ${MIN_PUBLIC_PHOTOS} public photos are required` },
        { status: 400 },
      );
    }

    const nextRegistrationCheck =
      body.registrationNumber != null
        ? normalizeRegistrationNumber(String(body.registrationNumber))
        : normalizeRegistrationNumber(String(car.registrationNumber || ""));
    if (nextRegistrationCheck) {
      if (!isValidRegistrationNumber(nextRegistrationCheck)) {
        return NextResponse.json({ error: "Invalid registration number" }, { status: 400 });
      }
      const { assertRegistrationAvailable, plateTakenResponse } = await import(
        "@/lib/server/assert-registration-available"
      );
      const check = await assertRegistrationAvailable(nextRegistrationCheck, { excludeId: id });
      if (!check.ok) {
        return NextResponse.json(plateTakenResponse(), { status: 409 });
      }
    }

    try {
      const { nextListingStatusAfterPartnerEdit } = await import("@/lib/server/car-published-store");
      const { liveInputFromCarFields, recordPartnerListingEditDiff } = await import(
        "@/lib/server/car-listing-edit-diff"
      );
      const nextStatus = nextListingStatusAfterPartnerEdit(String(car.status));
      const insuranceBefore = await readCarInsuranceUrl(id);
      const existingPhotos = Array.isArray(car.photos)
        ? car.photos
            .map((p: { url?: string } | string) => (typeof p === "string" ? p : String(p?.url || "")))
            .filter(Boolean)
        : [];
      const beforeLive = liveInputFromCarFields({
        title: car.title,
        description: car.description,
        dailyRateEur: car.dailyRateEur,
        discountPercent: car.discountPercent,
        make: car.make,
        model: car.model,
        year: car.year,
        registrationNumber: car.registrationNumber,
        seats: car.seats,
        doors: car.doors,
        fuelType: car.fuelType,
        transmission: car.transmission,
        photoUrls: existingPhotos,
        passportFrontUrl: car.passport?.frontUrl || "",
        passportBackUrl: car.passport?.backUrl || "",
        insuranceUrl: insuranceBefore || "",
      });
      const extraRows = body.extras !== undefined ? await resolveCarExtras(body.extras) : null;
      let deliveryRows: ReturnType<typeof resolvePartnerDeliveryPrices>["rows"] | null = null;
      let deliveryAdjustments: ReturnType<typeof resolvePartnerDeliveryPrices>["adjustments"] = [];
      if (body.deliveryPrices !== undefined) {
        const deliveryCatalog = await listPartnerScopedDeliveryLocations(car.partnerId);
        if (!deliveryCatalog.length) {
          return NextResponse.json(
            { error: "No operating airports on your partner profile. Contact admin before listing." },
            { status: 400 },
          );
        }
        const resolved = resolvePartnerDeliveryPrices(deliveryCatalog, body.deliveryPrices);
        deliveryRows = resolved.rows;
        deliveryAdjustments = resolved.adjustments;
        if (!deliveryRows.length) {
          return NextResponse.json(
            { error: "Enable Delivery for at least one of your operating airports." },
            { status: 400 },
          );
        }
      }

      const nextMake = body.make != null ? String(body.make) : car.make;
      const nextModel = body.model != null ? String(body.model) : car.model;
      let nextCategorySlug: string | null | undefined = undefined;
      if (Object.prototype.hasOwnProperty.call(body, "categorySlug")) {
        const rawSlug = String(body.categorySlug ?? "").trim();
        try {
          nextCategorySlug =
            (await normalizePartnerCategorySlug(rawSlug)) ||
            (await resolveCategorySlugForCar(nextMake, nextModel)) ||
            rawSlug ||
            null;
        } catch {
          nextCategorySlug = rawSlug || car.categorySlug;
        }
      } else if (body.make != null || body.model != null) {
        try {
          nextCategorySlug =
            (await resolveCategorySlugForCar(nextMake, nextModel)) || car.categorySlug;
        } catch {
          nextCategorySlug = car.categorySlug;
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (photos) {
          await tx.carPhoto.deleteMany({ where: { carId: id } });
          await tx.carPhoto.createMany({
            data: photos.map((url, sortOrder) => ({ carId: id, url, sortOrder })),
          });
        }
        if (body.passportFrontUrl && body.passportBackUrl) {
          await tx.carPassport.upsert({
            where: { carId: id },
            create: { carId: id, frontUrl: body.passportFrontUrl, backUrl: body.passportBackUrl },
            update: { frontUrl: body.passportFrontUrl, backUrl: body.passportBackUrl },
          });
        }
        if (extraRows) {
          await tx.carExtra.deleteMany({ where: { carId: id } });
          if (extraRows.length) {
            await tx.carExtra.createMany({
              data: extraRows.map((row) => ({
                carId: id,
                extraServiceId: row.extraServiceId,
                priceEur: row.priceEur,
              })),
            });
          }
        }
        if (deliveryRows) {
          await tx.carDeliveryPrice.deleteMany({ where: { carId: id } });
          if (deliveryRows.length) {
            await tx.carDeliveryPrice.createMany({
              data: deliveryRows.map((row) => ({
                carId: id,
                deliveryLocationId: row.deliveryLocationId,
                priceEur: row.priceEur,
                freeAfterDays: row.freeAfterDays,
                travelTimeMinutes: row.travelTimeMinutes,
              })),
            });
          }
        }

        return tx.car.update({
          where: { id },
          data: {
            make: body.make != null ? String(body.make) : undefined,
            model: body.model != null ? String(body.model) : undefined,
            year: body.year != null ? Number(body.year) : undefined,
            seats: body.seats != null ? Number(body.seats) : undefined,
            doors: body.doors != null ? Number(body.doors) : undefined,
            transmission: body.transmission ?? undefined,
            fuelType: body.fuelType ?? undefined,
            registrationNumber:
              body.registrationNumber != null
                ? normalizeRegistrationNumber(String(body.registrationNumber)) || null
                : undefined,
            title: body.title ?? undefined,
            description: body.description ?? undefined,
            dailyRateEur: body.dailyRateEur != null ? Number(body.dailyRateEur) : undefined,
            discountPercent: body.discountPercent != null ? Number(body.discountPercent) : undefined,
            ...(nextCategorySlug !== undefined ? { categorySlug: nextCategorySlug } : {}),
            status: nextStatus as "PENDING" | "PENDING_REMODERATION" | "DRAFT" | "APPROVED" | "REJECTED",
            hiddenReason:
              nextStatus === "APPROVED"
                ? null
                : car.status === "REJECTED" && car.hiddenReason
                  ? car.hiddenReason
                  : nextStatus === "PENDING_REMODERATION"
                    ? "Partner edited listing — awaiting re-moderation"
                    : car.hiddenReason,
          },
          include: {
            photos: true,
            extras: { include: { extraService: true } },
            deliveryPrices: true,
          },
        });
      });
      if (Object.prototype.hasOwnProperty.call(body, "insuranceUrl")) {
        const nextInsurance = normalizeInsuranceUrl(body.insuranceUrl);
        if (!nextInsurance && car.status !== "DRAFT") {
          return NextResponse.json({ error: "Insurance document is required" }, { status: 400 });
        }
        await persistCarInsuranceDocument(id, body.insuranceUrl);
      }
      if (Object.prototype.hasOwnProperty.call(body, "insuranceExpiresAt")) {
        const nextExpiry = normalizeInsuranceExpiresAt(body.insuranceExpiresAt);
        if (!nextExpiry && car.status !== "DRAFT") {
          return NextResponse.json({ error: "Insurance expiry date is required" }, { status: 400 });
        }
        await persistCarInsuranceDocument(id, undefined, body.insuranceExpiresAt);
      }
      try {
        const insuranceDoc = await readCarInsuranceDoc(id);
        const insuranceUrl = insuranceDoc?.insuranceUrl || null;
        const nextPhotos = Array.isArray(photos)
          ? photos.map(String)
          : Array.isArray(updated.photos)
            ? updated.photos
                .map((p: { url?: string } | string) =>
                  typeof p === "string" ? p : String(p?.url || ""),
                )
                .filter(Boolean)
            : [];
        await recordPartnerListingEditDiff({
          carId: id,
          before: beforeLive,
          afterLive: liveInputFromCarFields({
            title: updated.title,
            description: updated.description,
            dailyRateEur: updated.dailyRateEur,
            discountPercent: updated.discountPercent,
            make: updated.make,
            model: updated.model,
            year: updated.year,
            registrationNumber: updated.registrationNumber,
            seats: updated.seats,
            doors: updated.doors,
            fuelType: updated.fuelType,
            transmission: updated.transmission,
            photoUrls: nextPhotos,
            passportFrontUrl:
              body.passportFrontUrl != null
                ? String(body.passportFrontUrl)
                : car.passport?.frontUrl || "",
            passportBackUrl:
              body.passportBackUrl != null
                ? String(body.passportBackUrl)
                : car.passport?.backUrl || "",
            insuranceUrl: insuranceUrl || "",
          }),
        });
      } catch (error) {
        console.error("[cars PATCH] recordPartnerListingEditDiff", error);
      }
      const insuranceAfter = await readCarInsuranceDoc(id);
      return NextResponse.json({
        ...updated,
        deliveryAdjustments,
        insuranceUrl: insuranceAfter?.insuranceUrl || null,
        insuranceExpiresAt: insuranceAfter?.insuranceExpiresAt || null,
      });
    } catch (error) {
      console.error("[cars PATCH owner]", error);
      return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
    }
  }

  return NextResponse.json(
    await prisma.car.update({
      where: { id },
      data: {
        status: body.status ?? undefined,
        hiddenReason: body.status === "APPROVED" ? null : body.hiddenReason,
      },
    }),
  );
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const partnerSession = await getPartnerSession();
  const adminSession = await getAdminSession();
  const isAdmin = adminSession?.user.role === "ADMIN";
  if (!partnerSession && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  clearPublicCarCache(id);

  let car: { partner?: { userId?: string | null } | null; partnerId?: string } | null = null;
  try {
    car = await prisma.car.findUnique({
      where: { id },
      include: { partner: { select: { userId: true } } },
    });
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  if (car) {
    const isOwner = Boolean(partnerSession && car.partner?.userId === partnerSession.user.id);
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      await prisma.car.delete({ where: { id } });
    } catch (error) {
      if (!isDbOfflineError(error)) {
        console.error("[cars DELETE]", error);
        return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
      }
    }
    await deleteFileCar(id);
    try {
      const { clearCarRejectionNotice } = await import("@/lib/server/car-rejection-store");
      await clearCarRejectionNotice(id);
    } catch {
      /* optional */
    }
    return NextResponse.json({ ok: true });
  }

  const fileCar = await getFileCar(id);
  if (!fileCar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fileOwner = isFileCarOwner(fileCar, partnerSession?.user);
  if (!fileOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const fileDeleted = await deleteFileCar(id);
  if (!fileDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const { clearCarRejectionNotice } = await import("@/lib/server/car-rejection-store");
    await clearCarRejectionNotice(id);
  } catch {
    /* optional */
  }
  return NextResponse.json({ ok: true });
}
