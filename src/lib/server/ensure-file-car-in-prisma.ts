import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeLogin } from "@/lib/crypto";
import { LOCAL_PARTNER_ID, TEST_PARTNER_EMAIL, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { nextPartnerSequentialNumber } from "@/lib/sequential-ids";
import { ensureExtrasExistInDb, listExtraServices } from "@/lib/server/extras-store";
import type { FileCarListing } from "@/lib/server/partner-cars-store";

function asTransmission(value: string): "AUTOMATIC" | "MANUAL" {
  return String(value || "").toUpperCase() === "MANUAL" ? "MANUAL" : "AUTOMATIC";
}

function asFuel(value: string): "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "LPG" {
  const v = String(value || "").toUpperCase();
  if (v === "DIESEL") return "DIESEL";
  if (v === "HYBRID" || v === "PLUGIN_HYBRID" || v === "PHEV") return "HYBRID";
  if (v === "ELECTRIC") return "ELECTRIC";
  if (v === "GAS" || v === "LPG" || v === "CNG") return "LPG";
  return "PETROL";
}

/** Resolve or create a real Partner row for a file-stored listing. */
async function resolvePartnerForFileCar(fileCar: FileCarListing) {
  const email = normalizeLogin(fileCar.partnerEmail || "");
  if (email) {
    const byEmail = await prisma.partner.findFirst({ where: { email } });
    if (byEmail) return byEmail;
  }

  if (fileCar.partnerUserId && !fileCar.partnerUserId.startsWith("file-")) {
    const byUser = await prisma.partner.findUnique({ where: { userId: fileCar.partnerUserId } });
    if (byUser) return byUser;
  }

  const local = loadLocalPartner();
  const isLocal =
    fileCar.partnerUserId === LOCAL_PARTNER_ID ||
    fileCar.partnerUserId === "local-partner" ||
    fileCar.partnerId === "file-partner-local-partner" ||
    (local != null &&
      (fileCar.partnerUserId === local.id ||
        (email && normalizeLogin(local.email) === email)));

  if (!isLocal || !local || normalizeLogin(local.email) === TEST_PARTNER_EMAIL || email === TEST_PARTNER_EMAIL) {
    throw new Error("Partner profile missing for this listing");
  }

  let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
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
  if (!user) throw new Error("Partner user missing for this listing");

  const existing = await prisma.partner.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  return prisma.partner.create({
    data: {
      userId: user.id,
      companyName: fileCar.partnerName || local.companyName || "Partner",
      contactName: fileCar.partnerName || local.companyName || "Partner",
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

/**
 * Upsert a file-store car into Postgres so Booking.carId FK resolves.
 * Keeps the same car id as the file listing.
 */
export async function ensureFileCarInPrisma(fileCar: FileCarListing) {
  if (fileCar.status !== "APPROVED") {
    throw new Error("Car is not available");
  }

  const existing = await prisma.car.findUnique({
    where: { id: fileCar.id },
    include: {
      extras: true,
      deliveryPrices: {
        include: {
          deliveryLocation: {
            include: { airport: { include: { city: { include: { country: true } } } } },
          },
        },
      },
      partner: { select: { id: true } },
    },
  });
  if (existing) return existing;

  const partner = await resolvePartnerForFileCar(fileCar);

  const catalog = await listExtraServices();
  await ensureExtrasExistInDb(catalog);
  const slugToId = new Map(catalog.map((e) => [e.slug, e.id]));
  const idSet = new Set(catalog.map((e) => e.id));

  const extraCreates = (fileCar.extras || [])
    .map((row) => {
      let extraServiceId = row.extraServiceId;
      if (!idSet.has(extraServiceId)) {
        const slug = extraServiceId.replace(/^file-/, "");
        extraServiceId = slugToId.get(slug) || slugToId.get(extraServiceId) || "";
      }
      if (!extraServiceId || !idSet.has(extraServiceId)) return null;
      return {
        extraServiceId,
        priceEur: Number(row.priceEur) || 0,
      };
    })
    .filter(Boolean) as Array<{ extraServiceId: string; priceEur: number }>;

  const deliveryIds = [...new Set((fileCar.deliveryPrices || []).map((r) => r.deliveryLocationId))];
  const existingLocs = deliveryIds.length
    ? await prisma.deliveryLocation.findMany({
        where: { id: { in: deliveryIds } },
        select: { id: true },
      })
    : [];
  const okLoc = new Set(existingLocs.map((l) => l.id));
  const deliveryCreates = (fileCar.deliveryPrices || [])
    .filter((r) => okLoc.has(r.deliveryLocationId))
    .map((r) => ({
      deliveryLocationId: r.deliveryLocationId,
      priceEur: Number(r.priceEur) || 0,
      freeAfterDays: r.freeAfterDays,
      travelTimeMinutes: r.travelTimeMinutes || 0,
    }));

  await prisma.car.create({
    data: {
      id: fileCar.id,
      partnerId: partner.id,
      title: fileCar.title,
      description: fileCar.description || "",
      make: fileCar.make,
      model: fileCar.model,
      year: fileCar.year,
      seats: fileCar.seats || 5,
      doors: fileCar.doors || 4,
      transmission: asTransmission(fileCar.transmission),
      fuelType: asFuel(fileCar.fuelType),
      dailyRateEur: Number(fileCar.dailyRateEur) || 0,
      discountPercent: 0,
      status: "APPROVED",
      registrationNumber: fileCar.registrationNumber,
      categorySlug: fileCar.categorySlug,
      photos: {
        create: (fileCar.photos || []).map((url, sortOrder) => ({ url, sortOrder })),
      },
      extras: extraCreates.length ? { create: extraCreates } : undefined,
      deliveryPrices: deliveryCreates.length ? { create: deliveryCreates } : undefined,
      passport:
        fileCar.passportFrontUrl && fileCar.passportBackUrl
          ? {
              create: {
                frontUrl: fileCar.passportFrontUrl,
                backUrl: fileCar.passportBackUrl,
              },
            }
          : undefined,
    },
  });

  const created = await prisma.car.findUnique({
    where: { id: fileCar.id },
    include: {
      extras: true,
      deliveryPrices: {
        include: {
          deliveryLocation: {
            include: { airport: { include: { city: { include: { country: true } } } } },
          },
        },
      },
      partner: { select: { id: true } },
    },
  });
  if (!created) throw new Error("Failed to sync car into database");
  return created;
}
