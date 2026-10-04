import "server-only";

import { formatBookingRef } from "@/lib/ids";
import { parsePartnerMessengers } from "@/lib/partner";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { readBookingMessengers } from "@/lib/server/booking-messengers-store";
import { readBookingResidence } from "@/lib/server/booking-residence-store";
import { splitStoredPhone } from "@/lib/catalog/dial-codes";
import { getFileBooking } from "@/lib/server/customer-bookings-store";
import { readBookingCancelNote } from "@/lib/server/booking-cancel-notes";
import { getFileCar } from "@/lib/server/partner-cars-store";
import type { DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import { buildMergedDeliveryRows, resolveDeliverySummary, withDeliveryFees } from "./delivery";
import {
  catalogExtrasForCar,
  hydrateBookingExtraLabels,
  localizedLabel,
  mapFileExtras,
} from "./extras";
import {
  carDailyRateFromListing,
  carHeaderFields,
  engineVolumeFromDescription,
  fromFile,
  resolvedDiscountPercentForBooking,
} from "./from-file";
import {
  resolveCountryIso2ForIata,
  resolvePartnerPayload,
} from "./partner-locations";
import type { BookingInfoDetailPayload } from "./types";

export async function withAdminRefundAlerts(
  detail: BookingInfoDetailPayload,
): Promise<BookingInfoDetailPayload> {
  try {
    const { listPendingRefundsForBooking } = await import(
      "@/lib/server/admin-booking-refunds-store"
    );
    const { expandRefundChangesFromTrip } = await import(
      "@/lib/bookings/refund-change-details"
    );
    const rows = await listPendingRefundsForBooking(detail.id);
    if (!rows.length) return { ...detail, adminRefundAlerts: [] };
    return {
      ...detail,
      adminRefundAlerts: rows.map((r) => {
        const changes = expandRefundChangesFromTrip({
          changes: r.changes,
          depositPercent: r.depositPercent,
          dailyRateEur: Number(detail.car.dailyRateEur) || 0,
          rentalLabel: "მანქანის ქირა",
          extras: detail.extras || [],
        });
        return {
          id: r.id,
          amountEur: r.amountEur,
          reason: r.reason,
          depositPercent: r.depositPercent,
          createdAt: r.createdAt,
          ...(changes.length ? { changes } : {}),
        };
      }),
    };
  } catch {
    return { ...detail, adminRefundAlerts: [] };
  }
}

/** Load booking detail for admin/partner/guest info windows (extras included). */
export async function loadBookingInfoDetail(
  id: string,
): Promise<BookingInfoDetailPayload | null> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            fuelType: true,
            transmission: true,
            seats: true,
            doors: true,
            dailyRateEur: true,
            description: true,
            discountPercent: true,
            categorySlug: true,
            registrationNumber: true,
            photos: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
            deliveryPrices: {
              select: {
                deliveryLocationId: true,
                priceEur: true,
                freeAfterDays: true,
                travelTimeMinutes: true,
              },
            },
            partner: {
              select: {
                id: true,
                companyName: true,
                logoUrl: true,
                phone: true,
                secondaryPhone: true,
                email: true,
                messengers: true,
                messenger: true,
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
      },
    });
    if (booking) {
      const catalogExtras = await catalogExtrasForCar(booking.carId);
      let extras = (booking.extras || []).map((e) => ({
        id: e.extraServiceId || e.id,
        label: e.label,
        priceEur: Number(e.priceEur) || 0,
      }));
      if (!extras.length) {
        const file = await getFileBooking(id);
        if (file?.extras?.length) extras = mapFileExtras(file.extras);
      }
      extras = await hydrateBookingExtraLabels(extras);
      const mapAirport = (airport: typeof booking.pickupAirport) => ({
        iata: airport.iata,
        city: localizedLabel(airport.city.name, airport.iata),
        name: localizedLabel(airport.name, airport.iata),
        timezone: String(airport.timezone || "").trim() || undefined,
      });
      const p = booking.car.partner;
      const partner = await resolvePartnerPayload({
        partnerId: p?.id,
        emailHint: p?.email,
        companyName: p?.companyName,
        phone: p?.phone,
        secondaryPhone: p?.secondaryPhone,
        messengers: p?.messengers,
        messenger: p?.messenger,
        companySettings: p?.companySettings,
        logoUrl: p?.logoUrl,
        sequentialNumber: p?.sequentialNumber,
      });
      let locationOptions: BookingInfoDetailPayload["locationOptions"] = [];
      const deliveryPrices = (booking.car.deliveryPrices || []).map((dp) => ({
        deliveryLocationId: dp.deliveryLocationId,
        priceEur: Number(dp.priceEur) || 0,
        freeAfterDays: dp.freeAfterDays,
        travelTimeMinutes: dp.travelTimeMinutes,
      }));
      const { rows: feeRows } = await buildMergedDeliveryRows({
        deliveryPrices,
        partnerId: booking.car.partner?.id,
      }).catch(() => ({ rows: [] as DeliveryPriceRowLike[] }));
      try {
        const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
        const locs = await listDeliveryLocations({ activeOnly: true });
        const bookingCountry = await resolveCountryIso2ForIata(booking.pickupAirport.iata);
        const baseOptions = locs
          .filter(
            (l) =>
              !bookingCountry ||
              String(l.countryIso2 || "").toUpperCase() === bookingCountry,
          )
          .map((l) => ({
            iata: String(l.iata || "").toUpperCase(),
            label: l.label || l.iata,
          }));
        const pickupIata = booking.pickupAirport.iata.toUpperCase();
        const dropoffIata = booking.dropoffAirport.iata.toUpperCase();
        if (!baseOptions.some((o) => o.iata === pickupIata)) {
          baseOptions.push({
            iata: pickupIata,
            label: localizedLabel(booking.pickupAirport.name, pickupIata),
          });
        }
        if (!baseOptions.some((o) => o.iata === dropoffIata)) {
          baseOptions.push({
            iata: dropoffIata,
            label: localizedLabel(booking.dropoffAirport.name, dropoffIata),
          });
        }
        baseOptions.sort((a, b) => a.label.localeCompare(b.label));
        locationOptions = withDeliveryFees(baseOptions, feeRows);
      } catch {
        locationOptions = withDeliveryFees(
          [
            {
              iata: booking.pickupAirport.iata,
              label: localizedLabel(booking.pickupAirport.name, booking.pickupAirport.iata),
            },
            {
              iata: booking.dropoffAirport.iata,
              label: localizedLabel(booking.dropoffAirport.name, booking.dropoffAirport.iata),
            },
          ],
          feeRows,
        );
      }
      const pickupMapped = mapAirport(booking.pickupAirport);
      const dropoffMapped = mapAirport(booking.dropoffAirport);
      const rentalDays = Math.max(
        1,
        Math.ceil(
          (booking.dropoffAt.getTime() - booking.pickupAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const discountPercent = await resolvedDiscountPercentForBooking({
        carId: booking.carId,
        pickupAt: booking.pickupAt.toISOString(),
        dropoffAt: booking.dropoffAt.toISOString(),
        baseDiscountPercent: Number(booking.car.discountPercent) || 0,
      });
      const delivery = await resolveDeliverySummary({
        deliveryPrices,
        pickupIata: pickupMapped.iata,
        dropoffIata: dropoffMapped.iata,
        pickupName: pickupMapped.name,
        dropoffName: dropoffMapped.name,
        pickupCity: pickupMapped.city,
        dropoffCity: dropoffMapped.city,
        rentalDays,
        partnerId: booking.car.partner?.id,
        partnerUserId: undefined,
      });
      const savedMessengers = await readBookingMessengers(booking.id);
      const guestMessengers = savedMessengers.length
        ? savedMessengers
        : parsePartnerMessengers(null, booking.guestMessenger);
      const prismaDetail: BookingInfoDetailPayload = {
        id: booking.id,
        sequentialNumber: booking.sequentialNumber,
        reference: formatBookingRef(booking.sequentialNumber),
        status: booking.status,
        pickupAt: booking.pickupAt.toISOString(),
        dropoffAt: booking.dropoffAt.toISOString(),
        flightNumber: booking.flightNumber || "",
        totalPriceEur: Number(booking.totalPriceEur),
        depositPercent: booking.depositPercent,
        depositPaidEur: Number(booking.depositPaidEur),
        balanceDueEur: Number(booking.balanceDueEur),
        promoCode: String(booking.promoCode || "").trim() || undefined,
        guestFirstName: booking.guestFirstName,
        guestLastName: booking.guestLastName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        dateOfBirth: booking.guestDateOfBirth || "",
        countryOfResidence:
          (await readBookingResidence(booking.id)) ||
          splitStoredPhone(booking.guestPhone || "", "").iso2,
        guestMessenger: guestMessengers[0] || booking.guestMessenger || "",
        guestMessengers,
        extras,
        carId: booking.carId,
        car: {
          make: booking.car.make,
          model: booking.car.model,
          year: booking.car.year,
          imageUrl: booking.car.photos?.[0]?.url || null,
          fuelType: String(booking.car.fuelType || ""),
          transmission: String(booking.car.transmission || ""),
          seats: booking.car.seats ?? null,
          doors: booking.car.doors ?? null,
          dailyRateEur: carDailyRateFromListing(
            Number(booking.car.dailyRateEur) || 0,
            booking.car.description,
            rentalDays,
            discountPercent,
          ),
          engineVolume: engineVolumeFromDescription(booking.car.description),
          ...(await carHeaderFields({
            categorySlug: booking.car.categorySlug,
            description: booking.car.description,
            registrationNumber: booking.car.registrationNumber,
          })),
        },
        partner,
        pickupAirport: pickupMapped,
        dropoffAirport: dropoffMapped,
        pickupAddress: booking.pickupAddress || "",
        dropoffAddress: booking.dropoffAddress || "",
        locationOptions,
        pendingChanges: null,
        fileStored: false,
        catalogExtras,
        delivery,
      };
      return withSiteDiscount(
        await withBusinessPartnerCode(await withCancelNote(await withAdminRefundAlerts(prismaDetail))),
      );
    }
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[booking-info-detail] prisma", error);
    }
  }

  const file = await getFileBooking(id);
  if (!file) return null;
  const fileCar = await getFileCar(file.carId);
  const catalogExtras = await catalogExtrasForCar(file.carId);
  const detail = await fromFile(file, fileCar, catalogExtras);
  if (!detail.countryOfResidence) {
    detail.countryOfResidence = await readBookingResidence(file.id);
  }
  return withSiteDiscount(
    await withBusinessPartnerCode(await withCancelNote(await withAdminRefundAlerts(detail))),
  );
}

async function withSiteDiscount(detail: BookingInfoDetailPayload) {
  const { readBookingSiteDiscount } = await import("@/lib/server/booking-site-discount-store");
  const percent = await readBookingSiteDiscount(detail.id).catch(() => 0);
  return percent > 0 ? { ...detail, siteDiscountPercent: percent } : detail;
}

async function withBusinessPartnerCode(detail: BookingInfoDetailPayload) {
  const { businessPartnerCodeForBooking, loadBusinessPartnerCodeIndex } = await import(
    "@/lib/server/business-partner-booking-codes"
  );
  const { formatBookingRef } = await import("@/lib/ids");
  const index = await loadBusinessPartnerCodeIndex().catch(() => null);
  if (!index) return detail;
  const code = businessPartnerCodeForBooking(index, {
    promoCode: detail.promoCode,
    bookingRef: detail.reference || formatBookingRef(detail.sequentialNumber) || detail.id,
  });
  return code ? { ...detail, businessPartnerCode: code } : detail;
}

async function withCancelNote(detail: BookingInfoDetailPayload) {
  if (String(detail.cancellationReason || "").trim()) return detail;
  const reason = await readBookingCancelNote(detail.id);
  return reason ? { ...detail, cancellationReason: reason } : detail;
}
