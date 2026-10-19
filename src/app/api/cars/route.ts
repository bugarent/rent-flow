import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { MIN_PUBLIC_PHOTOS } from "@/lib/brand";
import {
  normalizePartnerCategorySlug,
  resolveCategorySlugForCar,
} from "@/lib/server/category-mapping";
import {
  isMandatoryExtra,
  normalizePartnerExtraPrice,
  type PartnerExtraInput,
} from "@/lib/extras/pricing";
import { resolvePartnerDeliveryPrices } from "@/lib/delivery/pricing";
import { listPartnerScopedDeliveryLocations, persistableCarDeliveryRows } from "@/lib/server/delivery-locations";
import { withPartnerDeliveryPrices } from "@/lib/server/partner-delivery-listing-sync";
import { ensureExtrasExistInDb, extrasRowsForCarFk, listExtraServices } from "@/lib/server/extras-store";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/cars/registration-number";
import { scopePickupPlacesInDescription } from "@/lib/cars/scope-pickup-places";
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
import { createServerTimer, searchPublicCars } from "@/lib/server/public-cars-search";

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
  const { searchParams } = new URL(req.url);
  if (searchParams.get("__debug") === "1") {
    const { loadSearchCatalog } = await import("@/lib/server/search-catalog");
    const { scopeSearchCars } = await import("@/lib/server/search-results-scope");
    const c = await loadSearchCatalog();
    const scoped = await scopeSearchCars(c.cars, c.cabinet, {
      pickup: searchParams.get("pickup") ?? undefined,
      prefsByPartner: c.prefsByPartner,
    });
    const reasons: Record<string, number> = {};
    for (const r of scoped.rejected) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
    return NextResponse.json({
      ageMs: Date.now() - c.builtAt,
      cars: c.cars.length,
      cabinetPartners: c.cabinet.byPartner.size,
      prefsPartners: [...c.prefsByPartner.values()].filter((v) => v.length).length,
      kept: scoped.cars.length,
      reasons,
    });
  }
  const timer = createServerTimer();
  const cars = await searchPublicCars(
    {
      category: searchParams.get("category") ?? undefined,
      pickup: searchParams.get("pickup") ?? undefined,
      dropoff: searchParams.get("dropoff") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    },
    timer,
  );
  return NextResponse.json(cars, {
    headers: {
      "Server-Timing": timer.header(),
      "Cache-Control": "public, max-age=0, must-revalidate",
      // Same query within 30s is answered by the Netlify edge; bookings re-check availability.
      "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}

async function resolveCarExtras(rawExtras: unknown) {
  // Global admin catalog — identical for every partner
  const catalog = await listExtraServices({ activeOnly: true });
  await ensureExtrasExistInDb(catalog);
  const inputs = Array.isArray(rawExtras) ? (rawExtras as PartnerExtraInput[]) : [];
  const inputById = new Map(inputs.map((i) => [i.extraServiceId, i]));

  const rows: Array<{ extraServiceId: string; priceEur: number; forbidden?: boolean }> = [];
  for (const service of catalog) {
    const input = inputById.get(service.id);
    if (!input && !isMandatoryExtra(service)) continue;
    const normalized = normalizePartnerExtraPrice(
      service,
      input ?? {
        extraServiceId: service.id,
        enabled: true,
        priceEur: service.defaultPriceEur,
      },
    );
    if (normalized) rows.push(normalized);
  }

  return extrasRowsForCarFk(rows, catalog);
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
      description: descriptionRaw,
      images,
      photos,
      techPassportUrl,
      passportFrontUrl,
      passportBackUrl,
      insuranceUrl,
      insuranceExpiresAt,
      extras,
      seats,
      doors,
      transmission,
      fuelType,
      status: statusRaw,
      registrationNumber: registrationNumberRaw,
      plate: plateRaw,
      categorySlug: categorySlugRaw,
    } = body;

    let description: string | null | undefined = descriptionRaw;
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

      // Places and fees come from the partner's Delivery page, never from the listing form.
      try {
        const { seedAirportsForUntouchedCountries } = await import("@/lib/server/partner-delivery-seed");
        await seedAirportsForUntouchedCountries(partner.id);
      } catch (error) {
        console.warn("[cars POST] airport seeding", error);
      }
      const deliveryCatalog = await listPartnerScopedDeliveryLocations(partner.id);
      description = scopePickupPlacesInDescription(description, deliveryCatalog);
      const resolved = resolvePartnerDeliveryPrices(
        deliveryCatalog,
        deliveryCatalog.map((loc) => ({ deliveryLocationId: loc.id, enabled: true, priceEur: 0 })),
      );
      const pricedRows = await withPartnerDeliveryPrices(partner.id, resolved.rows, deliveryCatalog);
      deliveryRows = (await persistableCarDeliveryRows(pricedRows, deliveryCatalog)) ?? [];

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
          deliveryAdjustments: [],
          insuranceUrl: normalizeInsuranceUrl(insuranceUrl),
          insuranceExpiresAt: normalizeInsuranceExpiresAt(insuranceExpiresAt),
          updateNotice: listingStatus === "DRAFT" ? "SAVED" : "PENDING",
        },
        { status: 201 },
      );
    } catch (dbError) {
      if (!isDbOfflineError(dbError)) throw dbError;

      const fileDelivery: FileCarDeliveryPrice[] = deliveryRows;

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
          updateNotice: listingStatus === "DRAFT" ? "SAVED" : "PENDING",
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
