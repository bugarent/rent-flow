import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { computeBufferEndsAt, rangesOverlap } from "@/lib/calendar/buffer";
import { notifyBookingEvent } from "@/lib/notifications";
import { cityStreetLabel, isCityLocationCode, nearestAirportCode, parseCityLocationCode } from "@/lib/catalog/search-places";
import {
  CANCELLATION_DAILY_EUR,
  DEFAULT_DEPOSIT_PERCENT,
  FULL_PROTECTION_DAILY_RATIO,
  resolveDailyRateEur,
  roundMoney,
} from "@/lib/cars/reserve-pricing";
import { parseCarDetails } from "@/lib/cars/car-details";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import { persistedBookingCharge } from "@/lib/bookings/booking-money";
import { parsePartnerMessengers } from "@/lib/partner";
import { isValidEmail } from "@/lib/crypto";
import { toNumber } from "@/lib/utils";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { getFileCar } from "@/lib/server/partner-cars-store";
import { resolveListingDiscountPercent } from "@/lib/server/partner-period-discounts-store";
import { ensureFileCarInPrisma } from "@/lib/server/ensure-file-car-in-prisma";
import { createFileBooking } from "@/lib/server/customer-bookings-store";

async function creditBusinessPartnerFromBooking(input: {
  promoCode?: string;
  sequentialNumber?: number | null;
  bookingId: string;
  airport?: string;
  customerName?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  partnerEarnedEur?: number;
  siteEarnedEur?: number;
}) {
  try {
    const { formatBookingRef } = await import("@/lib/ids");
    const { normalizeReferralCode } = await import("@/lib/business-partner/codes");
    const { attributeBookingToBusinessPartner } = await import(
      "@/lib/server/business-partners-store"
    );
    const code = normalizeReferralCode(String(input.promoCode || ""));
    if (!code) {
      console.warn("[bookings] BP attribution skipped: empty promo code", {
        bookingId: input.bookingId,
      });
      return;
    }
    const bookingRef =
      formatBookingRef(input.sequentialNumber) || String(input.bookingId || "").trim();
    if (!bookingRef) {
      console.warn("[bookings] BP attribution skipped: empty booking ref", {
        code,
        bookingId: input.bookingId,
      });
      return;
    }
    const updated = await attributeBookingToBusinessPartner({
      code,
      bookingRef,
      airport: input.airport,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerFirstName: input.customerFirstName,
      customerLastName: input.customerLastName,
      amountUsd: input.partnerEarnedEur,
      siteEarnedUsd: input.siteEarnedEur,
    });
    if (!updated) {
      console.warn("[bookings] BP attribution returned null (inactive/missing partner?)", {
        code,
        bookingRef,
        partnerEarnedEur: input.partnerEarnedEur,
      });
      return;
    }
    console.info("[bookings] BP attributed", {
      code,
      bookingRef,
      earnedUsd: updated.earnedUsd,
      referralBookings: updated.referralBookings,
      partnerEarnedEur: input.partnerEarnedEur,
    });
  } catch (error) {
    console.warn("[bookings] business partner attribution failed", error);
  }
}

async function resolveBusinessPartnerCharge(input: {
  promoCode: string;
  rentalEur: number;
  extrasEur: number;
  deliveryEur: number;
  depositPercent: number;
  /** Guest checked “I don't have a promo” — do not use the QR cookie. */
  declinePartnerReferral?: boolean;
}) {
  const { resolveBusinessPartnerReferralCode } = await import(
    "@/lib/server/business-partner-referral"
  );
  const { getActiveBusinessPartnerByCode, resolvePartnerPayoutPercentForNextBooking } =
    await import("@/lib/server/business-partners-store");
  const { persistedBookingCharge } = await import("@/lib/bookings/booking-money");
  const {
    settleBusinessPartnerBookingMoney,
    computeBusinessPartnerReferralSplit,
  } = await import("@/lib/business-partner/referral-pricing");

  const code = await resolveBusinessPartnerReferralCode(input.promoCode, {
    allowCookieFallback: !input.declinePartnerReferral,
  });
  const partner = code ? await getActiveBusinessPartnerByCode(code) : null;
  if (!partner) {
    const charge = persistedBookingCharge({
      rentalEur: input.rentalEur,
      extrasEur: input.extrasEur,
      deliveryEur: input.deliveryEur,
      depositPercent: input.depositPercent,
    });
    return {
      charge,
      split: null as null | ReturnType<typeof settleBusinessPartnerBookingMoney>["split"],
      code: null as string | null,
    };
  }

  const partnerOfSitePercent = await resolvePartnerPayoutPercentForNextBooking(partner.id);

  // Always compute attribution split from pre-discount rental+extras (even if settle soft-fails).
  const split = computeBusinessPartnerReferralSplit(
    input.rentalEur + input.extrasEur,
    partnerOfSitePercent,
  );

  try {
    const settled = settleBusinessPartnerBookingMoney({
      rentalEur: input.rentalEur,
      extrasEur: input.extrasEur,
      deliveryEur: input.deliveryEur,
      depositPercent: input.depositPercent,
      partnerOfSitePercent,
    });
    return {
      charge: {
        totalPriceEur: settled.chargedEur,
        depositPaidEur: settled.onlineEur,
        balanceDueEur: settled.onSiteEur,
        settled,
      },
      split: settled.split,
      code: partner.referralCode,
    };
  } catch (error) {
    console.warn("[bookings] BP settle failed — using standard charge, still attributing", error);
    const charge = persistedBookingCharge({
      rentalEur: input.rentalEur,
      extrasEur: input.extrasEur,
      deliveryEur: input.deliveryEur,
      depositPercent: input.depositPercent,
    });
    return { charge, split, code: partner.referralCode };
  }
}

export async function POST(req: Request) {
  const session = await getCustomerSession();

  try {
    const body = await req.json();
    const {
      carId,
      startDate,
      endDate,
      flightNumber,
      pickupAirportIata,
      dropoffAirportIata,
      pickupAddress,
      dropoffAddress,
      extraIds,
      extras,
      fullProtection,
      cancellationProtection,
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      dateOfBirth,
      promoCode,
    } = body;

    const guestDateOfBirth =
      typeof dateOfBirth === "string" ? dateOfBirth.trim().slice(0, 32) : "";
    const countryOfResidence = String(
      (body as { countryOfResidence?: unknown }).countryOfResidence || "",
    )
      .trim()
      .toUpperCase()
      .slice(0, 2);
    const guestCountry = /^[A-Z]{2}$/.test(countryOfResidence) ? countryOfResidence : "";
    const rememberResidence = async (bookingId: string) => {
      if (!guestCountry) return;
      try {
        const { saveBookingResidence } = await import("@/lib/server/booking-residence-store");
        await saveBookingResidence(bookingId, guestCountry);
      } catch {
        /* residence is also stored on the file booking */
      }
    };
    const bookingPromoCode =
      typeof promoCode === "string" ? promoCode.trim().slice(0, 64).toUpperCase() : "";
    const declinePartnerReferral = Boolean(
      (body as { declinePartnerReferral?: unknown }).declinePartnerReferral,
    );
    const guestMessengers = parsePartnerMessengers(
      (body as { messengers?: unknown }).messengers,
    );
    if (!guestMessengers.length) {
      return NextResponse.json({ error: "Select at least one messenger." }, { status: 400 });
    }
    const guestMessenger = guestMessengers[0];
    const rememberMessengers = async (bookingId: string) => {
      try {
        const { saveBookingMessengers } = await import("@/lib/server/booking-messengers-store");
        await saveBookingMessengers(bookingId, guestMessengers);
      } catch {
        /* messenger list is also stored on the file booking */
      }
    };

    const id = typeof carId === "string" ? carId.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Car is required" }, { status: 400 });
    }

    try {
      const { isCustomerContactBanned } = await import("@/lib/server/customer-bans-store");
      const contactEmail =
        (typeof guestEmail === "string" && guestEmail.trim()) ||
        session?.user?.email ||
        "";
      const contactPhone = typeof guestPhone === "string" ? guestPhone.trim() : "";
      const ban = await isCustomerContactBanned({
        email: contactEmail,
        phone: contactPhone || undefined,
      });
      if (ban) {
        return NextResponse.json(
          { error: "This email or phone number is blocked from creating bookings." },
          { status: 403 },
        );
      }
      // Also block suspended session users
      if (session?.user?.id) {
        try {
          const { prisma: db } = await import("@/lib/prisma");
          const me = await db.user.findUnique({
            where: { id: session.user.id },
            select: { status: true, email: true, phone: true },
          });
          if (me?.status === "SUSPENDED") {
            return NextResponse.json(
              { error: "This account is blocked from creating bookings." },
              { status: 403 },
            );
          }
          if (me) {
            const ban2 = await isCustomerContactBanned({ email: me.email, phone: me.phone });
            if (ban2) {
              return NextResponse.json(
                { error: "This email or phone number is blocked from creating bookings." },
                { status: 403 },
              );
            }
          }
        } catch {
          /* optional */
        }
      }
    } catch {
      /* ban store optional */
    }

    const pickupCode = String(pickupAirportIata || "TBS");
    const dropoffCode = String(dropoffAirportIata || pickupAirportIata || "TBS");
    const pickupIsCity = isCityLocationCode(pickupCode);
    const dropoffIsCity = isCityLocationCode(dropoffCode);
    const pickupStreet =
      cityStreetLabel(pickupCode, typeof pickupAddress === "string" ? pickupAddress : "") ||
      (typeof pickupAddress === "string" ? pickupAddress.trim() : "");
    const dropoffStreet =
      cityStreetLabel(dropoffCode, typeof dropoffAddress === "string" ? dropoffAddress : "") ||
      (typeof dropoffAddress === "string" ? dropoffAddress.trim() : "");

    const { resolveAirportLocation } = await import("@/lib/server/resolve-airport-location");
    const { parseClientBookingInstant } = await import("@/lib/datetime/airport-timezone");
    const { assertPickupReturnHours } = await import("@/lib/locations/operating-hours");
    const pickupLoc = await resolveAirportLocation(
      pickupIsCity ? nearestAirportCode(pickupCode) || pickupCode : pickupCode,
    );
    const dropoffLoc = await resolveAirportLocation(
      dropoffIsCity ? nearestAirportCode(dropoffCode) || dropoffCode : dropoffCode,
    );

    let pickupAt: Date;
    let dropoffAt: Date;
    try {
      pickupAt = parseClientBookingInstant(String(startDate || ""), pickupLoc.timezone);
      dropoffAt = parseClientBookingInstant(String(endDate || ""), dropoffLoc.timezone);
    } catch {
      return NextResponse.json({ error: "Invalid rental dates" }, { status: 400 });
    }
    if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime()) || dropoffAt <= pickupAt) {
      return NextResponse.json({ error: "Invalid rental dates" }, { status: 400 });
    }
    const { pickupInstantTooSoon } = await import("@/lib/bookings/lead-time");
    if (pickupInstantTooSoon(pickupAt)) {
      return NextResponse.json(
        { error: "Pickup must be at least 2 hours from now" },
        { status: 400 },
      );
    }

    const hoursCheck = assertPickupReturnHours({
      pickupAt,
      dropoffAt,
      pickupTimeZone: pickupLoc.timezone,
      dropoffTimeZone: dropoffLoc.timezone,
      pickupHours: pickupLoc.hours,
      dropoffHours: dropoffLoc.hours,
    });
    if (!hoursCheck.ok) {
      return NextResponse.json(
        {
          error:
            hoursCheck.code === "PICKUP_OUTSIDE_HOURS"
              ? "Pickup time is outside airport operating hours"
              : "Return time is outside airport operating hours",
          code: hoursCheck.code,
        },
        { status: 400 },
      );
    }

    const bufferEndsAt = computeBufferEndsAt(dropoffAt);

    const carInclude = {
      extras: true,
      deliveryPrices: {
        include: {
          deliveryLocation: {
            include: { airport: { include: { city: { include: { country: true } } } } },
          },
        },
      },
      partner: { select: { id: true } },
    } as const;

    let car: Awaited<ReturnType<typeof ensureFileCarInPrisma>> | null = null;
    let dbOffline = false;

    try {
      car = await prisma.car.findUnique({
        where: { id },
        include: carInclude,
      });
    } catch (error) {
      if (isDbOfflineError(error)) {
        dbOffline = true;
        console.warn("[bookings] DB offline on car lookup", error);
      } else {
        throw error;
      }
    }

    if (!car) {
      const fileCar = await getFileCar(id);
      if (!fileCar || fileCar.status !== "APPROVED") {
        return NextResponse.json({ error: "Car is not available" }, { status: 404 });
      }

      try {
        const { carHasBookingConflict } = await import("@/lib/server/car-availability");
        if (await carHasBookingConflict(id, pickupAt, dropoffAt)) {
          return NextResponse.json(
            { error: "Car is not available for the selected dates (including 12h buffer)" },
            { status: 409 },
          );
        }
      } catch {
        /* availability check best-effort */
      }

      if (!dbOffline) {
        try {
          car = await ensureFileCarInPrisma(fileCar);
        } catch (error) {
          if (isDbOfflineError(error)) {
            dbOffline = true;
          } else {
            console.warn("[bookings] ensureFileCarInPrisma failed, using file booking", error);
            dbOffline = true;
          }
        }
      }

      if (!car) {
        // Offline / sync failed — persist booking in file store so checkout can complete.
    const days = Math.max(
      1,
      Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const details = parseCarDetails(fileCar.description);
    const discountPercent = await resolveListingDiscountPercent({
      carId: id,
      basePercent: toNumber(
        (fileCar as { discountPercent?: number }).discountPercent,
      ),
      pickupDate: pickupAt.toISOString().slice(0, 10),
      dropoffDate: dropoffAt.toISOString().slice(0, 10),
    });
    const daily = roundMoney(
      resolveDailyRateEur(details, toNumber(fileCar.dailyRateEur), discountPercent, days),
    );
        const { buildBookingExtraLines } = await import("@/lib/bookings/build-extra-lines");
        const { extraServiceNameById } = await import("@/lib/server/extras/names");
        const { customerExtraQuotes } = await import("@/lib/server/extras/hydrate");
        const extraNames = await extraServiceNameById();
        const quotes = await customerExtraQuotes({
          rawExtras: fileCar.extras,
          partnerId: fileCar.partnerId,
          carId: id,
        });
        const extraLines = buildBookingExtraLines({
          extras,
          extraIds,
          catalog: quotes.map((quote) => ({
            extraServiceId: quote.extraServiceId,
            priceEur: quote.priceEur,
            name: extraNames.get(quote.extraServiceId) || "",
            maxPeriodEur: quote.maxPeriodEur,
            minPeriodEur: quote.minPeriodEur,
          })),
          days,
          dailyRateEur: daily,
          fullProtection: Boolean(fullProtection),
          cancellationProtection: Boolean(cancellationProtection),
        });
        let extrasTotal = extraLines.reduce((sum, line) => sum + line.priceEur, 0);
        let deliveryFeeEur = 0;
        let leadChecked = false;
        try {
          const { computeTripDeliveryFees, mergeDeliveryPrefsIntoRows } = await import(
            "@/lib/delivery/trip-fees"
          );
          const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
          const { normalizeLocationCode } = await import("@/lib/catalog/search-places");
          const { readPartnerDeliveryPrefs } = await import(
            "@/lib/server/partner-delivery-prefs-store"
          );
          const locations = await listDeliveryLocations({ activeOnly: false });
          const byId = new Map(locations.map((l) => [l.id, l]));
          let rows = (fileCar.deliveryPrices || []).map((row) => {
            const loc = byId.get(row.deliveryLocationId);
            const iata = (loc?.iata || normalizeLocationCode(row.deliveryLocationId) || "").toUpperCase();
            return {
              deliveryLocationId: row.deliveryLocationId,
              priceEur: row.priceEur,
              freeAfterDays: row.freeAfterDays,
              travelTimeMinutes: row.travelTimeMinutes,
              deliveryLocation: {
                id: loc?.id || row.deliveryLocationId,
                isActive: loc ? loc.isActive !== false : Boolean(iata),
                airport: iata
                  ? {
                      iata,
                      city: { country: { iso2: (loc?.countryIso2 || "").toUpperCase() } },
                    }
                  : null,
              },
            };
          });
          const partnerKeys = [
            fileCar.partnerId,
            fileCar.partnerUserId,
            String(fileCar.partnerId || "").startsWith("file-partner-")
              ? String(fileCar.partnerId).slice("file-partner-".length)
              : "",
            "local-partner",
          ].filter((k, i, arr) => Boolean(k) && arr.indexOf(k) === i);
          let prefs: Awaited<ReturnType<typeof readPartnerDeliveryPrefs>> = [];
          for (const key of partnerKeys) {
            prefs = await readPartnerDeliveryPrefs(key);
            if (prefs.length) break;
          }
          if (prefs.length) {
            rows = mergeDeliveryPrefsIntoRows(rows, prefs);
          }
          const { evaluatePickupLeadTime } = await import("@/lib/delivery/booking-lead");
          const lead = evaluatePickupLeadTime({
            pickupAt,
            pickupCode,
            rows,
            cityIso2: pickupIsCity ? parseCityLocationCode(pickupCode)?.iso2 : null,
          });
          leadChecked = true;
          if (!lead.ok) {
            const hours = Math.max(1, Math.ceil(lead.requiredMinutes / 60));
            return NextResponse.json(
              {
                error: `Pickup must be at least ${hours} hour(s) from now for this location`,
              },
              { status: 400 },
            );
          }
          deliveryFeeEur = computeTripDeliveryFees({
            rows,
            pickup: pickupCode,
            dropoff: dropoffCode,
            rentalDays: days,
          }).totalFeeEur;
        } catch {
          deliveryFeeEur = 0;
        }
        if (!leadChecked) {
          const { evaluatePickupLeadTime } = await import("@/lib/delivery/booking-lead");
          const lead = evaluatePickupLeadTime({
            pickupAt,
            pickupCode,
            rows: [],
            cityIso2: pickupIsCity ? parseCityLocationCode(pickupCode)?.iso2 : null,
          });
          if (!lead.ok) {
            const hours = Math.max(1, Math.ceil(lead.requiredMinutes / 60));
            return NextResponse.json(
              {
                error: `Pickup must be at least ${hours} hour(s) from now for this location`,
              },
              { status: 400 },
            );
          }
        }

        const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
        const platformSettings = await getPlatformSettings();
        const depositPercent =
          typeof platformSettings.depositPercent === "number" &&
          Number.isFinite(platformSettings.depositPercent)
            ? Math.trunc(platformSettings.depositPercent)
            : DEFAULT_DEPOSIT_PERCENT;
        const { charge, split: bpSplit, code: bpCode } = await resolveBusinessPartnerCharge({
          promoCode: declinePartnerReferral ? "" : bookingPromoCode,
          rentalEur: roundMoney(daily * days),
          extrasEur: extrasTotal,
          deliveryEur: deliveryFeeEur,
          depositPercent,
          declinePartnerReferral,
        });
        const totalPriceEur = charge.totalPriceEur;
        const depositPaidEur = charge.depositPaidEur;
        const balanceDueEur = charge.balanceDueEur;
        const guestFirst =
          typeof guestFirstName === "string" && guestFirstName.trim()
            ? guestFirstName.trim()
            : String(session?.user?.name || "").split(/\s+/)[0] || "Guest";
        const guestLast =
          typeof guestLastName === "string" && guestLastName.trim()
            ? guestLastName.trim()
            : String(session?.user?.name || "").split(/\s+/).slice(1).join(" ") || "Customer";
        const guestMail =
          typeof guestEmail === "string" && guestEmail.trim()
            ? guestEmail.trim()
            : String(session?.user?.email || "").trim();
        const guestTel =
          typeof guestPhone === "string" && guestPhone.trim() ? guestPhone.trim() : "";

        if (!guestFirst || !guestLast || !guestMail) {
          return NextResponse.json(
            { error: "Please complete the main driver's information." },
            { status: 400 },
          );
        }
        if (!isValidEmail(guestMail)) {
          return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
        }
        if (!guestTel) {
          return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
        }

        const booking = await createFileBooking({
          carId: id,
          customerId: session?.user?.id || "guest",
          pickupAirportIata: pickupIsCity ? nearestAirportCode(pickupCode) : pickupCode.toUpperCase(),
          dropoffAirportIata: dropoffIsCity
            ? nearestAirportCode(dropoffCode)
            : dropoffCode.toUpperCase(),
          pickupAt: pickupAt.toISOString(),
          dropoffAt: dropoffAt.toISOString(),
          bufferEndsAt: bufferEndsAt.toISOString(),
          pickupAddress: pickupStreet,
          dropoffAddress: dropoffStreet,
          flightNumber: typeof flightNumber === "string" ? flightNumber.trim() : "",
          totalPriceEur,
          depositPercent: bpSplit ? charge.settled.depositPercent : depositPercent,
          depositPaidEur,
          balanceDueEur,
          guestFirstName: guestFirst,
          guestLastName: guestLast,
          guestPhone: guestTel,
          guestEmail: guestMail,
          guestMessenger,
          guestMessengers,
          extras: extraLines.map((line) => ({
            id: line.id,
            label: line.label,
            priceEur: line.priceEur,
            qty: line.qty,
          })),
          ...(guestDateOfBirth ? { dateOfBirth: guestDateOfBirth } : {}),
          ...(guestCountry ? { countryOfResidence: guestCountry } : {}),
          ...(bookingPromoCode || bpCode
            ? { promoCode: bpCode || bookingPromoCode }
            : {}),
        });

        try {
          const { notifyFileBookingEvent } = await import("@/lib/notifications");
          await notifyFileBookingEvent(booking);
        } catch (notifyError) {
          console.warn("[bookings] notifyFileBookingEvent failed", notifyError);
        }
        try {
          const { markBookingUnread } = await import("@/lib/server/admin-booking-unread-store");
          await markBookingUnread(booking.id);
        } catch {
          /* best-effort */
        }
        void import("@/lib/server/channel-publish")
          .then((mod) => mod.noteReservationPublished(booking.carId))
          .catch(() => undefined);

        await rememberMessengers(booking.id);
        await rememberResidence(booking.id);
        let bpCredit: { code: string; partnerEarnedEur: number; siteEarnedEur: number } | null =
          null;
        if (bpCode && bpSplit) {
          await creditBusinessPartnerFromBooking({
            promoCode: bpCode,
            sequentialNumber: booking.sequentialNumber,
            bookingId: booking.id,
            airport: booking.pickupAirportIata,
            customerName: `${guestFirst} ${guestLast}`.trim(),
            customerEmail: guestMail,
            customerFirstName: guestFirst,
            customerLastName: guestLast,
            partnerEarnedEur: bpSplit.partnerEarnedEur,
            siteEarnedEur: bpSplit.siteEarnedEur,
          });
          bpCredit = {
            code: bpCode,
            partnerEarnedEur: bpSplit.partnerEarnedEur,
            siteEarnedEur: bpSplit.siteEarnedEur,
          };
        }
        return NextResponse.json({ ...booking, bpCredit }, { status: 201 });
      }
    }

    if (!car || car.status !== "APPROVED") {
      return NextResponse.json({ error: "Car is not available" }, { status: 404 });
    }

    try {
      const { carHasBookingConflict } = await import("@/lib/server/car-availability");
      if (await carHasBookingConflict(id, pickupAt, dropoffAt)) {
        return NextResponse.json(
          { error: "Car is not available for the selected dates (including 12h buffer)" },
          { status: 409 },
        );
      }
    } catch (error) {
      if (!isDbOfflineError(error)) {
        // Fall back to legacy checks below if helper fails for unexpected reasons
        let existing: Array<{ pickupAt: Date; bufferEndsAt: Date }> = [];
        try {
          existing = await prisma.booking.findMany({
            where: { carId: id, status: { in: ["PENDING", "CONFIRMED"] } },
            select: { pickupAt: true, bufferEndsAt: true },
          });
        } catch (dbError) {
          if (!isDbOfflineError(dbError)) throw dbError;
        }
        const blocked = existing.some((b) =>
          rangesOverlap(pickupAt, bufferEndsAt, b.pickupAt, b.bufferEndsAt),
        );
        if (blocked) {
          return NextResponse.json(
            { error: "Car is not available for the selected dates (including 12h buffer)" },
            { status: 409 },
          );
        }
      }
    }

    const pickupIata = pickupIsCity ? nearestAirportCode(pickupCode) : pickupCode.toUpperCase();
    const dropoffIata = dropoffIsCity ? nearestAirportCode(dropoffCode) : dropoffCode.toUpperCase();

    try {
      const { ensureAirportsByIata } = await import("@/lib/server/partner-airports");
      await ensureAirportsByIata([pickupIata, dropoffIata].filter(Boolean));
    } catch (error) {
      console.warn("[bookings] ensureAirportsByIata", error);
    }

    const pickupAirport = await prisma.airport.findUnique({ where: { iata: pickupIata } });
    const dropoffAirport = await prisma.airport.findUnique({ where: { iata: dropoffIata } });
    if (!pickupAirport || !dropoffAirport) {
      return NextResponse.json({ error: "Unknown airport" }, { status: 400 });
    }

    const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
    const platformSettings = await getPlatformSettings();
    const depositPercent =
      typeof platformSettings.depositPercent === "number" &&
      Number.isFinite(platformSettings.depositPercent)
        ? Math.trunc(platformSettings.depositPercent)
        : DEFAULT_DEPOSIT_PERCENT;

    const days = Math.max(1, Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (1000 * 60 * 60 * 24)));
    const details = parseCarDetails(car.description);
    const discountPercent = await resolveListingDiscountPercent({
      carId: id,
      basePercent: toNumber(car.discountPercent),
      pickupDate: pickupAt.toISOString().slice(0, 10),
      dropoffDate: dropoffAt.toISOString().slice(0, 10),
    });
    const daily = roundMoney(
      resolveDailyRateEur(details, toNumber(car.dailyRateEur), discountPercent, days),
    );

    const { customerExtraQuotes } = await import("@/lib/server/extras/hydrate");
    const quotes = await customerExtraQuotes({
      rawExtras: car.extras,
      partnerId: car.partner?.id,
      carId: car.id,
    });
    const quoteById = new Map(quotes.map((quote) => [quote.extraServiceId, quote]));
    let extrasTotal = 0;
    if (Array.isArray(extras)) {
      for (const item of extras) {
        const extraId = String(item?.id || item?.extraServiceId || "");
        const qty = Math.max(0, Math.min(5, Number(item?.qty) || 0));
        if (!extraId || qty <= 0) continue;
        const quote = quoteById.get(extraId);
        if (quote) {
          extrasTotal += extraPeriodCharge(
            quote.priceEur,
            days,
            qty,
            quote.maxPeriodEur,
            quote.minPeriodEur,
          );
        }
      }
    } else if (Array.isArray(extraIds)) {
      extrasTotal = quotes
        .filter((quote) => extraIds.includes(quote.extraServiceId))
        .reduce(
          (sum, quote) =>
            sum +
            extraPeriodCharge(
              quote.priceEur,
              days,
              1,
              quote.maxPeriodEur,
              quote.minPeriodEur,
            ),
          0,
        );
    }

    if (fullProtection) {
      extrasTotal += roundMoney(daily * FULL_PROTECTION_DAILY_RATIO * days);
    }
    if (cancellationProtection) {
      extrasTotal += roundMoney(CANCELLATION_DAILY_EUR * days);
    }

    const { buildBookingExtraLines } = await import("@/lib/bookings/build-extra-lines");
    const { extraServiceNameById } = await import("@/lib/server/extras/names");
    const extraNames = await extraServiceNameById();
    const bookingExtraLines = buildBookingExtraLines({
      extras,
      extraIds,
        catalog: quotes.map((quote) => ({
          extraServiceId: quote.extraServiceId,
          priceEur: quote.priceEur,
          name: extraNames.get(quote.extraServiceId) || "",
          maxPeriodEur: quote.maxPeriodEur,
          minPeriodEur: quote.minPeriodEur,
        })),
      days,
      dailyRateEur: daily,
      fullProtection: Boolean(fullProtection),
      cancellationProtection: Boolean(cancellationProtection),
    });

    let deliveryFeeEur = 0;
    let leadChecked = false;
    try {
      const { readPartnerDeliveryPrefs } = await import("@/lib/server/partner-delivery-prefs-store");
      const {
        computeTripDeliveryFees,
        mergeDeliveryPrefsIntoRows,
      } = await import("@/lib/delivery/trip-fees");
      const prefs = await readPartnerDeliveryPrefs(car.partner.id);
      const rows = mergeDeliveryPrefsIntoRows(
        (car.deliveryPrices || []).map((row) => ({
          deliveryLocationId: row.deliveryLocationId,
          priceEur: row.priceEur,
          freeAfterDays: row.freeAfterDays,
          travelTimeMinutes: row.travelTimeMinutes,
          deliveryLocation: row.deliveryLocation
            ? {
                id: row.deliveryLocation.id,
                isActive: row.deliveryLocation.isActive,
                airport: row.deliveryLocation.airport
                  ? {
                      iata: row.deliveryLocation.airport.iata,
                      city: {
                        country: {
                          iso2: row.deliveryLocation.airport.city?.country?.iso2 || "",
                        },
                      },
                    }
                  : null,
              }
            : null,
        })),
        prefs,
      );
      const { evaluatePickupLeadTime } = await import("@/lib/delivery/booking-lead");
      const lead = evaluatePickupLeadTime({
        pickupAt,
        pickupCode,
        rows,
        cityIso2: pickupIsCity ? parseCityLocationCode(pickupCode)?.iso2 : null,
      });
      leadChecked = true;
      if (!lead.ok) {
        const hours = Math.max(1, Math.ceil(lead.requiredMinutes / 60));
        return NextResponse.json(
          {
            error: `Pickup must be at least ${hours} hour(s) from now for this location`,
          },
          { status: 400 },
        );
      }
      deliveryFeeEur = computeTripDeliveryFees({
        rows,
        pickup: pickupCode,
        dropoff: dropoffCode,
        rentalDays: days,
      }).totalFeeEur;
    } catch {
      deliveryFeeEur = 0;
    }
    if (!leadChecked) {
      const { evaluatePickupLeadTime } = await import("@/lib/delivery/booking-lead");
      const lead = evaluatePickupLeadTime({
        pickupAt,
        pickupCode,
        rows: [],
        cityIso2: pickupIsCity ? parseCityLocationCode(pickupCode)?.iso2 : null,
      });
      if (!lead.ok) {
        const hours = Math.max(1, Math.ceil(lead.requiredMinutes / 60));
        return NextResponse.json(
          {
            error: `Pickup must be at least ${hours} hour(s) from now for this location`,
          },
          { status: 400 },
        );
      }
    }

    const { charge, split: bpSplit, code: bpCode } = await resolveBusinessPartnerCharge({
      promoCode: declinePartnerReferral ? "" : bookingPromoCode,
      rentalEur: roundMoney(daily * days),
      extrasEur: extrasTotal,
      deliveryEur: deliveryFeeEur,
      depositPercent,
      declinePartnerReferral,
    });
    const totalPriceEur = charge.totalPriceEur;
    const depositPaidEur = charge.depositPaidEur;
    const balanceDueEur = charge.balanceDueEur;
    const effectiveDepositPercent = bpSplit ? charge.settled.depositPercent : depositPercent;

    const guestFirst =
      typeof guestFirstName === "string" && guestFirstName.trim()
        ? guestFirstName.trim()
        : "";
    const guestLast =
      typeof guestLastName === "string" && guestLastName.trim()
        ? guestLastName.trim()
        : "";
    const guestMail =
      typeof guestEmail === "string" && guestEmail.trim()
        ? guestEmail.trim()
        : "";
    const guestTel =
      typeof guestPhone === "string" && guestPhone.trim()
        ? guestPhone.trim()
        : "";

    const customer = session?.user?.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : null;

    // No account (or stale session without a user row): guest file booking.
    if (!customer) {
      if (!guestFirst || !guestLast || !guestMail) {
        return NextResponse.json(
          { error: "Please complete the main driver's information." },
          { status: 400 },
        );
      }
      if (!isValidEmail(guestMail)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
      if (!guestTel) {
        return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
      }
      const booking = await createFileBooking({
        carId: id,
        customerId: "guest",
        pickupAirportIata: pickupIata,
        dropoffAirportIata: dropoffIata,
        pickupAt: pickupAt.toISOString(),
        dropoffAt: dropoffAt.toISOString(),
        bufferEndsAt: bufferEndsAt.toISOString(),
        pickupAddress: pickupStreet,
        dropoffAddress: dropoffStreet,
        flightNumber: typeof flightNumber === "string" ? flightNumber.trim() : "",
        totalPriceEur,
        depositPercent: effectiveDepositPercent,
        depositPaidEur,
        balanceDueEur,
        guestFirstName: guestFirst,
        guestLastName: guestLast,
        guestPhone: guestTel,
        guestEmail: guestMail,
        guestMessenger,
        guestMessengers,
        extras: bookingExtraLines.map((line) => ({
          id: line.id,
          label: line.label,
          priceEur: line.priceEur,
          qty: line.qty,
        })),
        ...(guestDateOfBirth ? { dateOfBirth: guestDateOfBirth } : {}),
        ...(guestCountry ? { countryOfResidence: guestCountry } : {}),
        ...(bookingPromoCode || bpCode ? { promoCode: bpCode || bookingPromoCode } : {}),
      });
      try {
        const { notifyFileBookingEvent } = await import("@/lib/notifications");
        await notifyFileBookingEvent(booking);
      } catch (notifyError) {
        console.warn("[bookings] notifyFileBookingEvent failed", notifyError);
      }
      try {
        const { markBookingUnread } = await import("@/lib/server/admin-booking-unread-store");
        await markBookingUnread(booking.id);
      } catch {
        /* best-effort */
      }
      await rememberMessengers(booking.id);
      await rememberResidence(booking.id);
      let bpCredit: { code: string; partnerEarnedEur: number; siteEarnedEur: number } | null =
        null;
      if (bpCode && bpSplit) {
        await creditBusinessPartnerFromBooking({
          promoCode: bpCode,
          sequentialNumber: booking.sequentialNumber,
          bookingId: booking.id,
          airport: booking.pickupAirportIata,
          customerName: `${guestFirst} ${guestLast}`.trim(),
          customerEmail: guestMail,
          customerFirstName: guestFirst,
          customerLastName: guestLast,
          partnerEarnedEur: bpSplit.partnerEarnedEur,
          siteEarnedEur: bpSplit.siteEarnedEur,
        });
        bpCredit = {
          code: bpCode,
          partnerEarnedEur: bpSplit.partnerEarnedEur,
          siteEarnedEur: bpSplit.siteEarnedEur,
        };
      }
      return NextResponse.json({ ...booking, bpCredit }, { status: 201 });
    }

    const resolvedFirst =
      guestFirst || String(customer.firstName || "").trim();
    const resolvedLast =
      guestLast || String(customer.lastName || "").trim();
    const resolvedMail =
      guestMail || String(customer.email || "").trim();
    const resolvedTel =
      guestTel || String(customer.phone || "").trim();

    if (!resolvedFirst || !resolvedLast || !resolvedMail) {
      return NextResponse.json(
        { error: "Please complete the main driver's information." },
        { status: 400 },
      );
    }
    if (!isValidEmail(resolvedMail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!resolvedTel) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const bookingData = {
      carId: id,
      customerId: customer.id,
      pickupAirportId: pickupAirport.id,
      dropoffAirportId: dropoffAirport.id,
      pickupAt,
      dropoffAt,
      bufferEndsAt,
      flightNumber: typeof flightNumber === "string" ? flightNumber.trim() : "",
      status: "PENDING" as const,
      totalPriceEur,
      depositPercent: effectiveDepositPercent,
      depositPaidEur,
      balanceDueEur,
      guestFirstName: resolvedFirst,
      guestLastName: resolvedLast,
      guestPhone: resolvedTel,
      guestEmail: resolvedMail,
      guestMessenger,
    };

    let sequentialNumber: number | undefined;
    try {
      const { nextBookingSequentialNumber } = await import("@/lib/sequential-ids");
      sequentialNumber = await nextBookingSequentialNumber();
    } catch {
      sequentialNumber = undefined;
    }

    async function createBooking(includeAddresses: boolean, withSequential: boolean) {
      return prisma.booking.create({
        data: {
          ...bookingData,
          ...(withSequential && sequentialNumber != null ? { sequentialNumber } : {}),
          ...(includeAddresses
            ? { pickupAddress: pickupStreet, dropoffAddress: dropoffStreet }
            : {}),
        },
      });
    }

    let booking;
    try {
      booking = await createBooking(true, true);
    } catch (firstError) {
      console.warn("[bookings] create with addresses failed", firstError);
      try {
        booking = await createBooking(false, true);
      } catch (secondError) {
        console.warn("[bookings] create retry without addresses failed", secondError);
        try {
          // Unique sequentialNumber collision or missing column — let DB autoincrement
          booking = await createBooking(true, false);
        } catch (thirdError) {
          console.error("[bookings] create failed", thirdError);
          const msg =
            thirdError instanceof Error && thirdError.message
              ? thirdError.message.slice(0, 240)
              : "Failed to create booking";
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }
    }

    try {
      if (pickupStreet || dropoffStreet || guestDateOfBirth || bookingPromoCode || bpCode) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            ...(pickupStreet ? { pickupAddress: pickupStreet } : {}),
            ...(dropoffStreet ? { dropoffAddress: dropoffStreet } : {}),
            ...(guestDateOfBirth ? { guestDateOfBirth } : {}),
            ...(bookingPromoCode || bpCode ? { promoCode: bpCode || bookingPromoCode } : {}),
          },
        });
      }
    } catch {
      /* optional columns may be missing on older DBs */
    }

    try {
      const catalogIds = new Set(quotes.map((quote) => quote.extraServiceId));
      const lines = bookingExtraLines.filter((line) => catalogIds.has(line.id));
      if (lines.length) {
        await prisma.bookingExtra.createMany({
          data: lines.map((line) => ({
            bookingId: booking.id,
            extraServiceId: line.id,
            priceEur: line.priceEur,
            label: line.label.slice(0, 200),
          })),
          skipDuplicates: true,
        });
      }
    } catch (extraErr) {
      console.warn("[bookings] BookingExtra create failed", extraErr);
    }

    try {
      await notifyBookingEvent(booking.id, "BOOKING_NEW");
    } catch (notifyError) {
      console.warn("[bookings] notifyBookingEvent failed", notifyError);
    }
    void import("@/lib/server/channel-publish")
      .then((mod) => mod.noteReservationPublished(booking.carId))
      .catch(() => undefined);
    try {
      const { markBookingUnread } = await import("@/lib/server/admin-booking-unread-store");
      await markBookingUnread(booking.id);
    } catch {
      /* best-effort */
    }

    // Fire-and-forget partner channel booking lock (do not fail the guest booking).
    void (async () => {
      try {
        const { listIntegrations } = await import("@/lib/integrations/repository");
        const { listMappings } = await import("@/lib/integrations/repository");
        const { findMappingByInternal } = await import("@/lib/integrations/mapping");
        const { pushBookingLock } = await import("@/lib/integrations/sync-engine");
        const { formatBookingRef } = await import("@/lib/ids");

        const { items } = await listIntegrations();
        const integrations = items.filter(
          (i) =>
            i.partnerId === car.partnerId &&
            ["LIVE", "TESTING"].includes(i.status) &&
            !i.manualOverride,
        );
        for (const integration of integrations) {
          const mappings = await listMappings(integration.id);
          const vehicleMap = findMappingByInternal(mappings, "VEHICLE", car.id);
          if (!vehicleMap) {
            try {
              await prisma.booking.update({
                where: { id: booking.id },
                data: { integrationLockStatus: "SKIPPED" },
              });
            } catch {
              /* schema may be unmigrated offline */
            }
            continue;
          }
          try {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { integrationLockStatus: "PENDING" },
            });
          } catch {
            /* ignore */
          }
          const lock = await pushBookingLock({
            integrationId: integration.id,
            lock: {
              externalId: vehicleMap.externalId,
              lockId: booking.id,
              pickupAt: pickupAt.toISOString(),
              dropoffAt: dropoffAt.toISOString(),
              bookingRef: formatBookingRef(booking.sequentialNumber) || booking.id,
            },
          });
          try {
            await prisma.booking.update({
              where: { id: booking.id },
              data: {
                integrationLockStatus: lock.ok ? "LOCKED" : "FAILED",
                externalRef: lock.externalBookingId || undefined,
              },
            });
          } catch {
            /* ignore */
          }
          break;
        }
      } catch (error) {
        console.warn("[bookings] integration lock failed", error);
      }
    })();

    await rememberMessengers(booking.id);
    await rememberResidence(booking.id);
    let bpCredit: { code: string; partnerEarnedEur: number; siteEarnedEur: number } | null =
      null;
    if (bpCode && bpSplit) {
      await creditBusinessPartnerFromBooking({
        promoCode: bpCode,
        sequentialNumber: booking.sequentialNumber,
        bookingId: booking.id,
        airport: pickupIata,
        customerName: `${resolvedFirst} ${resolvedLast}`.trim(),
        customerEmail: resolvedMail,
        customerFirstName: resolvedFirst,
        customerLastName: resolvedLast,
        partnerEarnedEur: bpSplit.partnerEarnedEur,
        siteEarnedEur: bpSplit.siteEarnedEur,
      });
      bpCredit = {
        code: bpCode,
        partnerEarnedEur: bpSplit.partnerEarnedEur,
        siteEarnedEur: bpSplit.siteEarnedEur,
      };
    }
    return NextResponse.json({ ...booking, bpCredit }, { status: 201 });
  } catch (error) {
    console.error("[bookings] POST failed", error);
    if (isDbOfflineError(error)) {
      return NextResponse.json(
        {
          error:
            "Database is temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 },
      );
    }
    const raw = error instanceof Error ? error.message : "";
    const safe =
      /Invalid `prisma|ECONNREFUSED|Can't reach database/i.test(raw)
        ? "Failed to create booking"
        : raw
          ? raw.slice(0, 200)
          : "Failed to create booking";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
