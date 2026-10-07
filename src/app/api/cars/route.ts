import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { MIN_PUBLIC_PHOTOS } from "@/lib/brand";
import {
  normalizePartnerCategorySlug,
  prismaWhereForMappedModels,
  resolveCategorySlugForCar,
} from "@/lib/server/category-mapping";
import {
  normalizePartnerExtraPrice,
  type PartnerExtraInput,
} from "@/lib/extras/pricing";
import { resolvePartnerDeliveryPrices } from "@/lib/delivery/pricing";
import { listPartnerScopedDeliveryLocations } from "@/lib/server/delivery-locations";
import { ensureExtrasExistInDb, listExtraServices } from "@/lib/server/extras-store";
import { isCityLocationCode, parseCityLocationCode } from "@/lib/catalog/search-places";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/cars/registration-number";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { LOCAL_PARTNER_ID, TEST_PARTNER_EMAIL, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { normalizeLogin } from "@/lib/crypto";
import { nextPartnerSequentialNumber } from "@/lib/sequential-ids";
import { persistCarInsuranceDocument } from "@/lib/server/car-passport-docs";
import {
  normalizeInsuranceExpiresAt,
  normalizeInsuranceUrl,
} from "@/lib/server/car-insurance-store";
import {
  createFileCar,
  fileCarToApiShape,
  type FileCarDeliveryPrice,
  type FileCarExtra,
  type FileCarStatus,
} from "@/lib/server/partner-cars-store";
import { loadPublicFileSearchCars } from "@/lib/server/public-file-cars";
import { publicListingStatusWhere } from "@/lib/cars/listing-visibility";

async function resolvePartnerForListing(session: {
  user: { id: string; email?: string | null };
}) {
  const email = normalizeLogin(session.user.email || "");
  let partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (partner) return partner;

  if (email) {
    partner = await prisma.partner.findFirst({ where: { email } });
    if (partner) {
      if (!partner.userId || partner.userId !== session.user.id) {
        try {
          partner = await prisma.partner.update({
            where: { id: partner.id },
            data: { userId: session.user.id },
          });
        } catch {
          /* keep found row */
        }
      }
      return partner;
    }
  }

  const local = loadLocalPartner();
  const isLocalSession =
    session.user.id === LOCAL_PARTNER_ID ||
    (local != null &&
      (session.user.id === local.id ||
        (email && normalizeLogin(local.email) === email)));

  if (!isLocalSession || !local || normalizeLogin(local.email) === TEST_PARTNER_EMAIL || email === TEST_PARTNER_EMAIL) {
    return null;
  }

  let user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;
  if (!user && email) {
    user = await prisma.user.create({
      data: {
        firstName: "Partner",
        lastName: local.companyName || "Fleet",
        email,
        phone: "+995000000000",
        countryOfResidence: "GE",
        preferredMessenger: "WHATSAPP",
        passwordHash: local.passwordHash,
        role: "VENDOR",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  } else if (user && user.role !== "VENDOR") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "VENDOR", status: "ACTIVE" },
    });
  }

  if (!user) return null;

  const existing = await prisma.partner.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  return prisma.partner.create({
    data: {
      userId: user.id,
      companyName: local.companyName || "Partner",
      contactName: local.companyName || "Partner",
      email: email || local.email,
      phone: "+995000000000",
      messenger: "WHATSAPP",
      fleetSize: 1,
      kind: "COMPANY",
      personalId: "00000000000",
      sequentialNumber: local.sequentialNumber ?? (await nextPartnerSequentialNumber()),
      status: "APPROVED",
      approvedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
}

export async function GET(req: Request) {
  try {
    const { applyExpiredInsuranceRemoderation } = await import(
      "@/lib/server/car-insurance-expiry"
    );
    await applyExpiredInsuranceRemoderation();
  } catch (error) {
    console.warn("[cars GET] insurance expiry", error);
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.trim();
  const pickup = searchParams.get("pickup")?.trim();
  const startDate = searchParams.get("startDate")?.trim();
  const endDate = searchParams.get("endDate")?.trim();

  const where: Prisma.CarWhereInput = {
    ...publicListingStatusWhere,
    partner: { status: { in: ["APPROVED", "PENDING_REMODERATION"] } },
  };

  if (pickup) {
    if (isCityLocationCode(pickup)) {
      const iso2 = parseCityLocationCode(pickup)?.iso2;
      if (iso2) {
        where.deliveryPrices = {
          some: {
            deliveryLocation: {
              isActive: true,
              airport: { city: { country: { iso2 } } },
            },
          },
        };
      }
    } else {
      where.deliveryPrices = {
        some: {
          deliveryLocation: {
            isActive: true,
            airport: { iata: pickup.toUpperCase() },
          },
        },
      };
    }
  }

  if (category) {
    const { listHomepageCategories } = await import("@/lib/server/homepage-categories-store");
    const homepageCategory = (await listHomepageCategories()).find((c) => c.slug === category);
    if (homepageCategory) {
      const modelFilter = prismaWhereForMappedModels(homepageCategory.mappedModels);
      if (modelFilter) {
        Object.assign(where, modelFilter);
      } else {
        where.id = "__none__";
      }
    } else {
      where.categorySlug = category;
    }
  }

  let cars: unknown[] = [];
  try {
    cars = await prisma.car.findMany({
      where,
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        deliveryPrices: {
          include: {
            deliveryLocation: {
              include: { airport: { include: { city: { include: { country: true } } } } },
            },
          },
        },
        partner: {
          select: {
            companyName: true,
            reviews: { where: { status: "APPROVED" }, select: { averageRating: true } },
          },
        },
      },
    });
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
    cars = [];
  }

  try {
    const fileCars = await loadPublicFileSearchCars({ pickup });
    const seen = new Set(
      cars.map((car) => (car && typeof car === "object" && "id" in car ? String((car as { id: string }).id) : "")),
    );
    for (const fileCar of fileCars) {
      if (seen.has(fileCar.id)) continue;
      cars.push(fileCar);
    }
  } catch {
    /* file catalog optional */
  }

  if (startDate && pickup) {
    const pickupAt = new Date(startDate);
    if (!Number.isNaN(pickupAt.getTime())) {
      const minutesUntilPickup = Math.max(0, Math.floor((pickupAt.getTime() - Date.now()) / 60000));
      const code = pickup.toUpperCase();
      const cityIso2 = isCityLocationCode(pickup)
        ? parseCityLocationCode(pickup)?.iso2?.toUpperCase()
        : null;
      const { meetsBookingLeadTime } = await import("@/lib/delivery/booking-lead");
      const { mergeDeliveryPrefsIntoRows } = await import("@/lib/delivery/trip-fees");
      const { readPartnerDeliveryPrefsMap } = await import(
        "@/lib/server/partner-delivery-prefs-store"
      );
      const partnerIds = [
        ...new Set(
          cars
            .map((raw) => {
              const car = raw as { partnerId?: string; partner?: { id?: string } };
              return String(car.partnerId || car.partner?.id || "");
            })
            .filter(Boolean),
        ),
      ];
      const prefsCache = await readPartnerDeliveryPrefsMap(partnerIds);
      cars = cars.filter((raw) => {
        const car = raw as {
          partnerId?: string;
          partner?: { id?: string };
          deliveryPrices?: Array<{
            travelTimeMinutes?: number | null;
            deliveryLocation?: {
              isActive?: boolean;
              airport?: { iata?: string; city?: { country?: { iso2?: string } } } | null;
            } | null;
          }>;
        };
        const pid = String(car.partnerId || car.partner?.id || "");
        let rows = car.deliveryPrices ?? [];
        const prefs = prefsCache.get(pid);
        if (prefs?.length) rows = mergeDeliveryPrefsIntoRows(rows, prefs);
        const matching = rows.filter((row) => {
          const loc = row.deliveryLocation;
          if (!loc?.isActive || !loc.airport) return false;
          if (cityIso2) return loc.airport.city?.country?.iso2?.toUpperCase() === cityIso2;
          return loc.airport.iata?.toUpperCase() === code;
        });
        if (!matching.length) return false;
        return matching.some((row) => meetsBookingLeadTime(row.travelTimeMinutes, minutesUntilPickup));
      });
    }
  }

  if (startDate) {
    const rangeStart = new Date(startDate);
    const rangeEnd = endDate ? new Date(endDate) : new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
    if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime())) {
      try {
        const { carIdsUnavailableInRange } = await import("@/lib/server/car-availability");
        const unavailable = await carIdsUnavailableInRange(rangeStart, rangeEnd);
        if (unavailable.size) {
          cars = cars.filter((raw) => {
            const id =
              raw && typeof raw === "object" && "id" in raw ? String((raw as { id: string }).id) : "";
            return id && !unavailable.has(id);
          });
        }
      } catch {
        /* availability optional */
      }
    }
  }

  try {
    const {
      mergeListingDiscountPercent,
      periodDiscountPercentByCarId,
    } = await import("@/lib/server/partner-period-discounts-store");
    const ids = cars
      .map((raw) =>
        raw && typeof raw === "object" && "id" in raw ? String((raw as { id: string }).id) : "",
      )
      .filter(Boolean);
    const discountFrom = startDate || new Date().toISOString();
    const discountTo = endDate || startDate || discountFrom;
    const periodMap = await periodDiscountPercentByCarId(discountFrom, discountTo, ids);
    cars = cars.map((raw) => {
      if (!raw || typeof raw !== "object" || !("id" in raw)) return raw;
      const id = String((raw as { id: string }).id);
      const base =
        "discountPercent" in raw ? Number((raw as { discountPercent?: unknown }).discountPercent) || 0 : 0;
      return {
        ...(raw as object),
        discountPercent: mergeListingDiscountPercent(base, periodMap.get(id) ?? 0),
      };
    });
  } catch {
    /* period discounts optional */
  }

  return NextResponse.json(cars);
}

async function resolveCarExtras(rawExtras: unknown) {
  // Global admin catalog — identical for every partner
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
    // Mandatory extras are always attached: free ones at €0, priced ones clamped to the admin range.
    const normalized = normalizePartnerExtraPrice(service, input);
    if (normalized) rows.push(normalized);
  }

  return rows;
}

function deliveryRowsFromBody(raw: unknown): FileCarDeliveryPrice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object" && (row as { enabled?: boolean }).enabled !== false)
    .map((row) => {
      const r = row as {
        deliveryLocationId?: string;
        priceEur?: number;
        freeAfterDays?: number | null;
        travelTimeMinutes?: number;
      };
      return {
        deliveryLocationId: String(r.deliveryLocationId || ""),
        priceEur: Number(r.priceEur) || 0,
        freeAfterDays: r.freeAfterDays == null ? 0 : Number(r.freeAfterDays) || 0,
        travelTimeMinutes: Number(r.travelTimeMinutes) || 0,
      };
    })
    .filter((row) => row.deliveryLocationId);
}

function extraRowsFromBody(raw: unknown): FileCarExtra[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as {
        extraServiceId?: string;
        priceEur?: number;
        enabled?: boolean;
        forbidden?: boolean;
      };
      if (!r.extraServiceId) return null;
      if (r.forbidden) {
        return { extraServiceId: String(r.extraServiceId), priceEur: 0, forbidden: true };
      }
      if (r.enabled === false) return null;
      return { extraServiceId: String(r.extraServiceId), priceEur: Number(r.priceEur) || 0 };
    })
    .filter((row): row is FileCarExtra => Boolean(row));
}

export async function POST(req: Request) {
  const session = await requirePartnerApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      make,
      model,
      year,
      pricePerDay,
      dailyRateEur,
      description,
      images,
      photos,
      techPassportUrl,
      passportFrontUrl,
      passportBackUrl,
      insuranceUrl,
      insuranceExpiresAt,
      extras,
      deliveryPrices,
      seats,
      doors,
      transmission,
      fuelType,
      status: statusRaw,
      registrationNumber: registrationNumberRaw,
      plate: plateRaw,
      categorySlug: categorySlugRaw,
    } = body;

    const publicPhotos: string[] = photos ?? images ?? [];
    const listingStatus =
      String(statusRaw || "").toUpperCase() === "DRAFT" || String(statusRaw || "").toUpperCase() === "HIDDEN"
        ? "DRAFT"
        : "PENDING";
    const forSale = listingStatus !== "DRAFT";

    const registrationNumber = normalizeRegistrationNumber(
      String(registrationNumberRaw ?? plateRaw ?? ""),
    );
    if (forSale && !registrationNumber) {
      return NextResponse.json({ error: "Registration number is required" }, { status: 400 });
    }
    if (registrationNumber && !isValidRegistrationNumber(registrationNumber)) {
      return NextResponse.json(
        { error: "Registration number must use only Latin letters and digits (e.g. AA123BB)" },
        { status: 400 },
      );
    }
    if (registrationNumber) {
      const { assertRegistrationAvailable, plateTakenResponse } = await import(
        "@/lib/server/assert-registration-available"
      );
      const check = await assertRegistrationAvailable(registrationNumber);
      if (!check.ok) {
        return NextResponse.json(plateTakenResponse(), { status: 409 });
      }
    }

    if (forSale && publicPhotos.length < MIN_PUBLIC_PHOTOS) {
      return NextResponse.json(
        { error: `At least ${MIN_PUBLIC_PHOTOS} public vehicle photos are required` },
        { status: 400 },
      );
    }

    const front = passportFrontUrl ?? techPassportUrl;
    const back = passportBackUrl;
    if (forSale && (!front || !back)) {
      return NextResponse.json({ error: "Both sides of the car passport are required" }, { status: 400 });
    }
    if (forSale && !normalizeInsuranceUrl(insuranceUrl)) {
      return NextResponse.json({ error: "Insurance document is required" }, { status: 400 });
    }
    if (forSale && !normalizeInsuranceExpiresAt(insuranceExpiresAt)) {
      return NextResponse.json(
        { error: "Insurance expiry date is required" },
        { status: 400 },
      );
    }

    const transmissionValue =
      String(transmission || "").toUpperCase() === "MANUAL" ? "MANUAL" : "AUTOMATIC";
    const fuelRaw = String(fuelType || "PETROL").toUpperCase();
    const fuelValue = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "LPG"].includes(fuelRaw)
      ? fuelRaw
      : "PETROL";

    let partner: Awaited<ReturnType<typeof resolvePartnerForListing>> = null;
    let extraRows: Array<{ extraServiceId: string; priceEur: number }> = [];
    let deliveryRows: Array<{
      deliveryLocationId: string;
      priceEur: number;
      freeAfterDays: number | null;
      travelTimeMinutes: number;
    }> = [];
    let deliveryAdjustments: unknown[] = [];
    let categorySlug: string | null = null;

    try {
      partner = await resolvePartnerForListing(session);
      if (!partner) {
        return NextResponse.json(
          { error: "Partner profile required. Save personal info or contact admin." },
          { status: 403 },
        );
      }

      try {
        const rawSlug = String(categorySlugRaw ?? "").trim();
        categorySlug =
          (await normalizePartnerCategorySlug(rawSlug)) ||
          (await resolveCategorySlugForCar(String(make ?? ""), String(model ?? ""))) ||
          // Keep partner-selected slug even if catalog lookup briefly fails.
          (rawSlug || null);
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
        const rawSlug = String(categorySlugRaw ?? "").trim();
        categorySlug = rawSlug || null;
      }
      try {
        extraRows = await resolveCarExtras(extras);
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
        extraRows = extraRowsFromBody(extras);
      }

      const deliveryCatalog = await listPartnerScopedDeliveryLocations(partner.id);
      if (forSale && !deliveryCatalog.length && !deliveryRowsFromBody(deliveryPrices).length) {
        return NextResponse.json(
          { error: "No operating airports on your partner profile. Contact admin before listing." },
          { status: 400 },
        );
      }
      const resolved = deliveryCatalog.length
        ? resolvePartnerDeliveryPrices(deliveryCatalog, deliveryPrices)
        : {
            rows: [] as typeof deliveryRows,
            adjustments: [] as typeof deliveryAdjustments,
          };
      deliveryRows = resolved.rows;
      deliveryAdjustments = resolved.adjustments;

      // Keep only delivery locations that exist in DB (file/catalog ids may not have FK rows yet).
      if (deliveryRows.length) {
        try {
          const { activatePartnerApprovedDeliveryLocations } = await import(
            "@/lib/server/delivery-locations"
          );
          await activatePartnerApprovedDeliveryLocations(
            deliveryRows.map((r) => r.deliveryLocationId),
          );
        } catch {
          /* best-effort activation */
        }
        const existing = await prisma.deliveryLocation.findMany({
          where: { id: { in: deliveryRows.map((r) => r.deliveryLocationId) } },
          select: { id: true },
        });
        const ok = new Set(existing.map((r) => r.id));
        if (ok.size < deliveryRows.length) {
          const iataMatches = deliveryCatalog.filter(
            (c) => c.iata && deliveryRows.some((r) => r.deliveryLocationId === c.id),
          );
          const byIata = iataMatches.length
            ? await prisma.deliveryLocation.findMany({
                where: {
                  OR: iataMatches.map((c) => ({ airport: { iata: c.iata } })),
                },
                select: { id: true, airport: { select: { iata: true } } },
              })
            : [];
          const iataToId = new Map(
            byIata.flatMap((r) => (r.airport?.iata ? [[r.airport.iata.toUpperCase(), r.id] as const] : [])),
          );
          deliveryRows = deliveryRows
            .map((r) => {
              if (ok.has(r.deliveryLocationId)) return r;
              const loc = deliveryCatalog.find((c) => c.id === r.deliveryLocationId);
              const mapped = loc?.iata ? iataToId.get(loc.iata.toUpperCase()) : undefined;
              return mapped ? { ...r, deliveryLocationId: mapped } : null;
            })
            .filter(Boolean) as typeof deliveryRows;
        } else {
          deliveryRows = deliveryRows.filter((r) => ok.has(r.deliveryLocationId));
        }
      }

      if (forSale && !deliveryRows.length) {
        const fromBody = deliveryRowsFromBody(deliveryPrices);
        if (fromBody.length) {
          deliveryRows = fromBody;
        } else {
          return NextResponse.json(
            {
              error:
                "Enable Delivery for at least one of your operating airports (locations must be active in admin catalog).",
              code: "NO_DELIVERY",
            },
            { status: 400 },
          );
        }
      }

      const car = await prisma.car.create({
        data: {
          title,
          make,
          model,
          year: Number(year),
          description: description ?? "",
          dailyRateEur: Number(dailyRateEur ?? pricePerDay),
          seats: Number(seats) > 0 ? Number(seats) : 5,
          doors: Number(doors) > 0 ? Number(doors) : 4,
          transmission: transmissionValue,
          fuelType: fuelValue as "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "LPG",
          partnerId: partner.id,
          status: listingStatus,
          categorySlug,
          registrationNumber: registrationNumber || null,
          photos: {
            create: publicPhotos.map((url: string, index: number) => ({ url, sortOrder: index })),
          },
          ...(front && back
            ? {
                passport: {
                  create: { frontUrl: String(front), backUrl: String(back) },
                },
              }
            : {}),
          extras: {
            create: extraRows.map(({ extraServiceId, priceEur }) => ({
              extraServiceId,
              priceEur,
            })),
          },
          ...(deliveryRows.length
            ? {
                deliveryPrices: {
                  create: deliveryRows,
                },
              }
            : {}),
        },
        include: {
          photos: true,
          extras: { include: { extraService: true } },
          deliveryPrices: { include: { deliveryLocation: { include: { airport: true } } } },
        },
      });

      await persistCarInsuranceDocument(car.id, insuranceUrl, insuranceExpiresAt);

      try {
        const { liveInputFromCarFields } = await import("@/lib/server/car-listing-edit-diff");
        const { ensurePublishedCarSnapshot } = await import("@/lib/server/car-published-store");
        const photoUrls = Array.isArray(car.photos)
          ? car.photos.map((p: { url?: string }) => String(p.url || "")).filter(Boolean)
          : publicPhotos;
        await ensurePublishedCarSnapshot(
          car.id,
          liveInputFromCarFields({
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
            photoUrls,
            passportFrontUrl: front ? String(front) : "",
            passportBackUrl: back ? String(back) : "",
            insuranceUrl: normalizeInsuranceUrl(insuranceUrl) || "",
          }),
        );
      } catch (error) {
        console.error("[cars POST] ensurePublishedCarSnapshot", error);
      }

      return NextResponse.json(
        {
          ...car,
          deliveryAdjustments,
          insuranceUrl: normalizeInsuranceUrl(insuranceUrl),
          insuranceExpiresAt: normalizeInsuranceExpiresAt(insuranceExpiresAt),
        },
        { status: 201 },
      );
    } catch (dbError) {
      if (!isDbOfflineError(dbError)) throw dbError;

      const fileDelivery = deliveryRows.length ? deliveryRows : deliveryRowsFromBody(deliveryPrices);
      if (forSale && !fileDelivery.length) {
        return NextResponse.json(
          {
            error:
              "Enable Delivery for at least one of your operating airports (locations must be active in admin catalog).",
            code: "NO_DELIVERY",
          },
          { status: 400 },
        );
      }

      const fileCar = await createFileCar({
        partnerId: partner?.id || `file-partner-${session.user.id}`,
        partnerUserId: session.user.id,
        partnerEmail: session.user.email || undefined,
        partnerName: partner?.companyName,
        title: String(title || `${make} ${model} ${year}`).trim(),
        make: String(make || ""),
        model: String(model || ""),
        year: Number(year) || new Date().getFullYear(),
        description: String(description ?? ""),
        dailyRateEur: Number(dailyRateEur ?? pricePerDay) || 0,
        seats: Number(seats) > 0 ? Number(seats) : 5,
        doors: Number(doors) > 0 ? Number(doors) : 4,
        transmission: transmissionValue,
        fuelType: fuelValue,
        status: listingStatus as FileCarStatus,
        registrationNumber: registrationNumber || null,
        categorySlug,
        photos: publicPhotos,
        passportFrontUrl: front ? String(front) : null,
        passportBackUrl: back ? String(back) : null,
        extras: extraRows.length ? extraRows : extraRowsFromBody(extras),
        deliveryPrices: fileDelivery,
      });
      await persistCarInsuranceDocument(fileCar.id, insuranceUrl, insuranceExpiresAt);
      try {
        const { liveInputFromCarFields } = await import("@/lib/server/car-listing-edit-diff");
        const { ensurePublishedCarSnapshot } = await import("@/lib/server/car-published-store");
        await ensurePublishedCarSnapshot(
          fileCar.id,
          liveInputFromCarFields({
            title: fileCar.title,
            description: fileCar.description,
            dailyRateEur: fileCar.dailyRateEur,
            discountPercent: 0,
            make: fileCar.make,
            model: fileCar.model,
            year: fileCar.year,
            registrationNumber: fileCar.registrationNumber || "",
            seats: fileCar.seats,
            doors: fileCar.doors,
            fuelType: fileCar.fuelType,
            transmission: fileCar.transmission,
            photoUrls: fileCar.photos || [],
            passportFrontUrl: fileCar.passportFrontUrl || "",
            passportBackUrl: fileCar.passportBackUrl || "",
            insuranceUrl: normalizeInsuranceUrl(insuranceUrl) || "",
          }),
        );
      } catch (error) {
        console.error("[cars POST file] ensurePublishedCarSnapshot", error);
      }
      return NextResponse.json(
        {
          ...fileCarToApiShape(
            fileCar,
            normalizeInsuranceUrl(insuranceUrl),
            normalizeInsuranceExpiresAt(insuranceExpiresAt),
          ),
          deliveryAdjustments: [],
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("[cars POST]", error);
    if (isDbOfflineError(error)) {
      return NextResponse.json(
        { error: "Database unavailable. Start Postgres and try again.", code: "DB_OFFLINE" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to create car listing" }, { status: 500 });
  }
}
