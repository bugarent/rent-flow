import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatBookingRef, parseBookingRef } from "@/lib/ids";
import { bookingSequentialCandidates } from "@/lib/bookings/sequential-candidates";
import { parsePartnerMessengers } from "@/lib/partner";
import { parseCompanySettings } from "@/lib/partners/company-settings";

const schema = z.object({
  bookingNumber: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200),
});

function localizedLabel(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "en" in value) {
    const en = (value as { en?: unknown }).en;
    if (typeof en === "string" && en.trim()) return en;
  }
  return fallback;
}

const bookingInclude = {
  car: {
    select: {
      make: true,
      model: true,
      year: true,
      photos: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
      partner: {
        select: {
          companyName: true,
          phone: true,
          secondaryPhone: true,
          email: true,
          messengers: true,
          messenger: true,
          logoUrl: true,
          companySettings: true,
          sequentialNumber: true,
        },
      },
    },
  },
  pickupAirport: { include: { city: { select: { name: true } } } },
  dropoffAirport: { include: { city: { select: { name: true } } } },
  extras: {
    select: { id: true, extraServiceId: true, label: true, priceEur: true },
  },
} as const;

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const parsed = parseBookingRef(body.bookingNumber);
    if (parsed == null) {
      return NextResponse.json({ error: "Invalid booking number" }, { status: 400 });
    }

    const email = body.email.toLowerCase();
    const candidates = bookingSequentialCandidates(parsed);

    type PrismaBooking = NonNullable<
      Awaited<ReturnType<typeof prisma.booking.findFirst<{ include: typeof bookingInclude }>>>
    >;
    let booking: PrismaBooking | null = null;

    try {
      for (const sequentialNumber of candidates) {
        booking = await prisma.booking.findFirst({
          where: {
            sequentialNumber,
            guestEmail: { equals: email, mode: "insensitive" },
            status: { in: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "UNFULFILLED"] },
          },
          include: bookingInclude,
        });
        if (booking) break;
      }
    } catch (dbError) {
      console.warn("[bookings/lookup] prisma unavailable, trying file store", dbError);
      booking = null;
    }

    if (!booking) {
      try {
        const { findFileBookingByRefAndEmail } = await import(
          "@/lib/server/customer-bookings-store"
        );
        let fileBooking = null;
        for (const sequentialNumber of candidates) {
          fileBooking = await findFileBookingByRefAndEmail(sequentialNumber, email);
          if (fileBooking) break;
        }
        if (fileBooking) {
          const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
          const detail = await loadBookingInfoDetail(fileBooking.id);
          if (detail) {
            return NextResponse.json({ booking: detail });
          }
        }
      } catch (fileError) {
        console.warn("[bookings/lookup] file fallback", fileError);
      }

      return NextResponse.json(
        { error: "We could not find a booking with those details." },
        { status: 404 },
      );
    }

    const mapAirport = (airport: typeof booking.pickupAirport) => ({
      iata: airport.iata,
      city: localizedLabel(airport.city.name, airport.iata),
      name: localizedLabel(airport.name, airport.iata),
      timezone: String(airport.timezone || "").trim() || undefined,
    });

    const partner = booking.car.partner;
    const legacyMessengers = parsePartnerMessengers(partner.messengers, partner.messenger);
    const company = parseCompanySettings(partner.companySettings, {
      companyName: partner.companyName,
      phone: partner.phone,
      secondaryPhone: partner.secondaryPhone,
      messengers: legacyMessengers,
      messenger: partner.messenger,
    });
    const primaryMessengers = company.primaryMessengers.length
      ? company.primaryMessengers
      : legacyMessengers;
    const secondaryMessengers = company.secondaryMessengers;

    const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
    const detailExtras = await loadBookingInfoDetail(booking.id);

    return NextResponse.json({
      booking: {
        id: booking.id,
        sequentialNumber: booking.sequentialNumber,
        reference: formatBookingRef(booking.sequentialNumber),
        status: booking.status,
        pickupAt: booking.pickupAt.toISOString(),
        dropoffAt: booking.dropoffAt.toISOString(),
        flightNumber: booking.flightNumber,
        totalPriceEur: Number(booking.totalPriceEur),
        depositPercent: booking.depositPercent,
        depositPaidEur: Number(booking.depositPaidEur),
        balanceDueEur: Number(booking.balanceDueEur),
        guestFirstName: booking.guestFirstName,
        guestLastName: booking.guestLastName,
        guestPhone: booking.guestPhone,
        guestEmail: booking.guestEmail,
        dateOfBirth: booking.guestDateOfBirth || "",
        extras:
          detailExtras?.extras?.length
            ? detailExtras.extras
            : (booking.extras || []).map((e) => ({
                id: e.extraServiceId || e.id,
                label: e.label,
                priceEur: Number(e.priceEur) || 0,
              })),
        carId: booking.carId,
        car: {
          make: booking.car.make,
          model: booking.car.model,
          year: booking.car.year,
          imageUrl: booking.car.photos?.[0]?.url || null,
          fuelType: detailExtras?.car.fuelType || "",
          transmission: detailExtras?.car.transmission || "",
          seats: detailExtras?.car.seats ?? null,
          doors: detailExtras?.car.doors ?? null,
          dailyRateEur: detailExtras?.car.dailyRateEur || 0,
          engineVolume: detailExtras?.car.engineVolume || "",
        },
        delivery: detailExtras?.delivery,
        partner: {
          companyName: detailExtras?.partner.companyName || partner.companyName,
          partnerCode: detailExtras?.partner.partnerCode || null,
          sequentialNumber: detailExtras?.partner.sequentialNumber ?? null,
          email: detailExtras?.partner.email || partner.email || "",
          phone: detailExtras?.partner.phone || partner.phone,
          secondaryPhone: detailExtras?.partner.secondaryPhone || partner.secondaryPhone,
          messengers:
            detailExtras?.partner.messengers?.length
              ? detailExtras.partner.messengers
              : [...new Set([...primaryMessengers, ...secondaryMessengers])],
          primaryMessengers:
            detailExtras?.partner.primaryMessengers?.length
              ? detailExtras.partner.primaryMessengers
              : primaryMessengers,
          secondaryMessengers:
            detailExtras?.partner.secondaryMessengers?.length
              ? detailExtras.partner.secondaryMessengers
              : secondaryMessengers,
          clientLanguages: detailExtras?.partner.clientLanguages || [],
          logoUrl: detailExtras?.partner.logoUrl || partner.logoUrl,
        },
        guestMessenger: detailExtras?.guestMessenger || "",
        guestMessengers: detailExtras?.guestMessengers || [],
        pickupAirport: mapAirport(booking.pickupAirport),
        dropoffAirport: mapAirport(booking.dropoffAirport),
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        fileStored: false,
        catalogExtras: detailExtras?.catalogExtras || [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    console.error("[bookings/lookup POST]", error);
    return NextResponse.json({ error: "Could not look up booking" }, { status: 500 });
  }
}
