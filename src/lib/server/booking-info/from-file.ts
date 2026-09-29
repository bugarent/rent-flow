import "server-only";

import { formatBookingRef } from "@/lib/ids";
import type { FileBookingRecord } from "@/lib/server/customer-bookings-store";
import type { FileCarListing } from "@/lib/server/partner-cars-store";
import { parsePartnerMessengers } from "@/lib/partner";
import { parseCarDetails } from "@/lib/cars/car-details";
import { splitStoredPhone } from "@/lib/catalog/dial-codes";
import { resolveDailyRateEur, roundMoney } from "@/lib/cars/reserve-pricing";
import type { DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import {
  mergeListingDiscountPercent,
  periodDiscountPercentByCarId,
} from "@/lib/server/partner-period-discounts-store";
import { buildMergedDeliveryRows, resolveDeliverySummary } from "./delivery";
import {
  hydrateBookingExtraLabels,
  mapFileExtras,
} from "./extras";
import {
  resolveAirportLabels,
  resolveCountryIso2ForIata,
  resolveLocationOptions,
  resolvePartnerPayload,
} from "./partner-locations";
import type { BookingInfoDetailPayload } from "./types";

/** Category name, or the entered body type, plus the car's plate. */
export async function carHeaderFields(input: {
  categorySlug?: string | null;
  description?: string | null;
  registrationNumber?: string | null;
}): Promise<{ categoryLabel: string; registrationNumber: string }> {
  const details = parseCarDetails(input.description);
  const registrationNumber = String(input.registrationNumber || details?.plate || "").trim();
  const rawSlug = String(input.categorySlug || details?.categorySlug || "").trim();
  const bodyType = String(details?.bodyType || "").trim();
  let categoryLabel = bodyType || rawSlug;
  try {
    const { listHomepageCategories } = await import("@/lib/server/homepage-categories-store");
    const categories = await listHomepageCategories();
    const candidates = [rawSlug, bodyType].map((value) => value.trim().toLowerCase()).filter(Boolean);
    const hit = categories.find((category) => {
      const slug = category.slug.trim().toLowerCase();
      const name = category.name.trim().toLowerCase();
      return candidates.some((value) => value === slug || value === name);
    });
    if (hit) categoryLabel = hit.name;
    else if (bodyType) categoryLabel = bodyType.toLowerCase();
  } catch {
    if (bodyType && !rawSlug) categoryLabel = bodyType.toLowerCase();
  }
  return { categoryLabel, registrationNumber };
}

export function engineVolumeFromDescription(description: string | null | undefined) {
  const details = parseCarDetails(description);
  const raw = String(details?.engineVolume || "").trim();
  return raw;
}

export function carDailyRateFromListing(
  dailyRateEur: number,
  description: string | null | undefined,
  rentalDays: number,
  discountPercent = 0,
) {
  const details = parseCarDetails(description);
  return roundMoney(
    resolveDailyRateEur(details, Number(dailyRateEur) || 0, discountPercent, rentalDays),
  );
}

export async function resolvedDiscountPercentForBooking(input: {
  carId: string;
  pickupAt: string;
  dropoffAt: string;
  baseDiscountPercent?: number;
}) {
  const base = Number(input.baseDiscountPercent) || 0;
  try {
    const map = await periodDiscountPercentByCarId(
      input.pickupAt,
      input.dropoffAt,
      [input.carId],
    );
    return mergeListingDiscountPercent(base, map.get(input.carId) ?? 0);
  } catch {
    return Math.min(100, Math.max(0, base));
  }
}

export async function fromFile(
  file: FileBookingRecord,
  fileCar: FileCarListing | null,
  catalogExtras: BookingInfoDetailPayload["catalogExtras"],
): Promise<BookingInfoDetailPayload> {
  const partner = await resolvePartnerPayload({
    partnerId: fileCar?.partnerId,
    emailHint: fileCar?.partnerEmail,
    companyName: fileCar?.partnerName || fileCar?.partnerEmail,
  });

  const bookingCountryIso2 = await resolveCountryIso2ForIata(file.pickupAirportIata);

  const { rows: feeRows } = await buildMergedDeliveryRows({
    deliveryPrices: fileCar?.deliveryPrices,
    partnerId: fileCar?.partnerId,
    partnerUserId: fileCar?.partnerUserId,
  }).catch(() => ({ rows: [] as DeliveryPriceRowLike[] }));

  const [pickupAirport, dropoffAirport, locationOptions, extras] = await Promise.all([
    resolveAirportLabels(file.pickupAirportIata, file.pickupAddress),
    resolveAirportLabels(file.dropoffAirportIata, file.dropoffAddress),
    resolveLocationOptions(
      fileCar,
      [file.pickupAirportIata, file.dropoffAirportIata],
      bookingCountryIso2,
      feeRows,
    ),
    hydrateBookingExtraLabels(mapFileExtras(file.extras)),
  ]);

  const rentalDays = Math.max(
    1,
    Math.ceil(
      (new Date(file.dropoffAt).getTime() - new Date(file.pickupAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const discountPercent = await resolvedDiscountPercentForBooking({
    carId: file.carId,
    pickupAt: file.pickupAt,
    dropoffAt: file.dropoffAt,
  });
  const delivery = await resolveDeliverySummary({
    deliveryPrices: fileCar?.deliveryPrices,
    pickupIata: file.pickupAirportIata,
    dropoffIata: file.dropoffAirportIata,
    pickupName: pickupAirport.name,
    dropoffName: dropoffAirport.name,
    pickupCity: pickupAirport.city,
    dropoffCity: dropoffAirport.city,
    rentalDays,
    partnerId: fileCar?.partnerId,
    partnerUserId: fileCar?.partnerUserId,
  });

  return {
    id: file.id,
    sequentialNumber: file.sequentialNumber,
    reference: formatBookingRef(file.sequentialNumber),
    status: file.status,
    cancellationReason: String(file.cancellationReason || "").trim() || undefined,
    pickupAt: file.pickupAt,
    dropoffAt: file.dropoffAt,
    flightNumber: file.flightNumber || "",
    totalPriceEur: file.totalPriceEur,
    depositPercent: file.depositPercent,
    depositPaidEur: file.depositPaidEur,
    balanceDueEur: file.balanceDueEur,
    promoCode: String(file.promoCode || "").trim() || undefined,
    guestFirstName: file.guestFirstName,
    guestLastName: file.guestLastName,
    guestEmail: file.guestEmail,
    guestPhone: file.guestPhone,
    dateOfBirth: file.dateOfBirth || "",
    countryOfResidence:
      String(file.countryOfResidence || "").trim().toUpperCase() ||
      splitStoredPhone(file.guestPhone || "", "").iso2,
    guestMessenger: parsePartnerMessengers(file.guestMessengers, file.guestMessenger)[0] || file.guestMessenger || "",
    guestMessengers: parsePartnerMessengers(file.guestMessengers, file.guestMessenger),
    extras,
    carId: file.carId,
    car: {
      make: fileCar?.make || "Vehicle",
      model: fileCar?.model || "",
      year: fileCar?.year || 0,
      imageUrl: fileCar?.photos?.[0] || null,
      fuelType: fileCar?.fuelType || "",
      transmission: fileCar?.transmission || "",
      seats: fileCar?.seats ?? null,
      doors: fileCar?.doors ?? null,
      dailyRateEur: carDailyRateFromListing(
        Number(fileCar?.dailyRateEur) || 0,
        fileCar?.description,
        rentalDays,
        discountPercent,
      ),
      engineVolume: engineVolumeFromDescription(fileCar?.description),
      ...(await carHeaderFields({
        categorySlug: fileCar?.categorySlug,
        description: fileCar?.description,
        registrationNumber: fileCar?.registrationNumber,
      })),
    },
    partner,
    pickupAirport,
    dropoffAirport,
    pickupAddress: file.pickupAddress || "",
    dropoffAddress: file.dropoffAddress || "",
    locationOptions,
    pendingChanges: file.pendingChanges ?? null,
    fileStored: true,
    catalogExtras,
    delivery,
  };
}
