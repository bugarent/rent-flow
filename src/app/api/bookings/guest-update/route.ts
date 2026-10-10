import { NextResponse } from "next/server";
import { z } from "zod";
import { computeBufferEndsAt } from "@/lib/calendar/buffer";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { readBookingSiteDiscount } from "@/lib/server/booking-site-discount-store";

const extraSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  priceEur: z.number().finite().nonnegative(),
  qty: z.number().int().min(1).max(5).optional(),
});

const schema = z.object({
  bookingId: z.string().min(1).max(80),
  email: z.string().trim().email().max(200),
  pickupAt: z.string().datetime().optional(),
  dropoffAt: z.string().datetime().optional(),
  pickupAirportIata: z.string().trim().min(2).max(8).optional(),
  dropoffAirportIata: z.string().trim().min(2).max(8).optional(),
  extras: z.array(extraSchema).max(30).optional(),
  replaceExtras: z.boolean().optional(),
  extrasPayNowEur: z.number().finite().nonnegative().optional(),
  projectedTotalEur: z.number().finite().nonnegative().optional(),
  depositPaidEur: z.number().finite().nonnegative().optional(),
  balanceDueEur: z.number().finite().nonnegative().optional(),
  refundableSiteFeeEur: z.number().finite().nonnegative().optional(),
  refundChanges: z
    .array(
      z.union([
        z.object({
          type: z.literal("dates"),
          pickupFrom: z.string(),
          pickupTo: z.string(),
          dropoffFrom: z.string(),
          dropoffTo: z.string(),
        }),
        z.object({
          type: z.literal("extra"),
          label: z.string().min(1).max(200),
          priceFromEur: z.number().finite().nonnegative(),
          priceToEur: z.number().finite().nonnegative(),
          siteFeeShareEur: z.number().finite().nonnegative().optional(),
        }),
      ]),
    )
    .max(40)
    .optional(),
  paymentMode: z.enum(["sandbox"]).optional(),
});

async function resolveAirportId(iata: string): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const airport = await prisma.airport.findFirst({
      where: { iata: iata.toUpperCase() },
      select: { id: true },
    });
    return airport?.id || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const pickupIata = body.pickupAirportIata
      ? body.pickupAirportIata.trim().toUpperCase()
      : undefined;
    const dropoffIata = body.dropoffAirportIata
      ? body.dropoffAirportIata.trim().toUpperCase()
      : undefined;

    const { getFileBooking, updateFileBooking } = await import(
      "@/lib/server/customer-bookings-store"
    );
    const file = await getFileBooking(body.bookingId);
    if (file && String(file.guestEmail || "").trim().toLowerCase() === email) {
      const pickupAt = body.pickupAt || file.pickupAt;
      const dropoffAt = body.dropoffAt || file.dropoffAt;
      if (!(new Date(dropoffAt).getTime() > new Date(pickupAt).getTime())) {
        return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
      }
      if (body.pickupAt && Math.abs(new Date(pickupAt).getTime() - new Date(file.pickupAt).getTime()) > 60_000) {
        const { pickupInstantTooSoon } = await import("@/lib/bookings/lead-time");
        if (pickupInstantTooSoon(new Date(pickupAt))) {
          return NextResponse.json(
            { error: "Pickup must be at least 2 hours from now" },
            { status: 400 },
          );
        }
      }
      const newExtras = body.extras || [];
      const replaceExtras = body.replaceExtras === true;
      const extrasPayNow = Number(body.extrasPayNowEur) || 0;
      const paidNow = body.paymentMode === "sandbox" && extrasPayNow > 0;

      const rentalDays = Math.max(
        1,
        Math.ceil(
          (new Date(dropoffAt).getTime() - new Date(pickupAt).getTime()) / (24 * 60 * 60 * 1000),
        ),
      );
      const { mergeMandatoryCatalogExtras } = await import("@/lib/server/booking-info-detail");
      const securedExtras = replaceExtras
        ? await mergeMandatoryCatalogExtras(file.carId, newExtras, rentalDays)
        : newExtras;

      const draftedExtras = replaceExtras
        ? securedExtras.map((line) => ({
            id: line.id,
            label: line.label,
            priceEur: line.priceEur,
            ...(line.qty != null ? { qty: line.qty } : {}),
          }))
        : (() => {
            const merged = [...(file.extras || [])];
            for (const line of securedExtras) {
              if (!merged.some((e) => e.id === line.id)) merged.push(line);
            }
            return merged;
          })();
      const { hydrateBookingExtraLabels } = await import("@/lib/server/booking-info/extras");
      const nextExtras = await hydrateBookingExtraLabels(draftedExtras);
      const { quoteGuestBookingCorrection } = await import("@/lib/server/guest-correction-quote");
      const quote = await quoteGuestBookingCorrection({
        bookingId: file.id,
        carId: file.carId,
        promoCode: file.promoCode,
        siteDiscountPercent: await readBookingSiteDiscount(file.id),
        depositPercent: file.depositPercent,
        totalPriceEur: file.totalPriceEur,
        depositPaidEur: file.depositPaidEur,
        balanceDueEur: file.balanceDueEur,
        oldPickupAt: file.pickupAt,
        oldDropoffAt: file.dropoffAt,
        newPickupAt: pickupAt,
        newDropoffAt: dropoffAt,
        oldPickupIata: file.pickupAirportIata,
        oldDropoffIata: file.dropoffAirportIata,
        newPickupIata: pickupIata || file.pickupAirportIata,
        newDropoffIata: dropoffIata || file.dropoffAirportIata,
        oldExtras: file.extras || [],
        newExtras: nextExtras,
      });
      const offeredPayNow = body.paymentMode === "sandbox" ? extrasPayNow : 0;
      if (quote.payNow > 0.02 && offeredPayNow + 0.05 < quote.payNow) {
        return NextResponse.json(
          { error: "Payment required for added days or services", payNowEur: quote.payNow },
          { status: 402 },
        );
      }
      const extrasDelta = securedExtras.reduce((s, e) => s + (Number(e.priceEur) || 0), 0);
      const totalPriceEur =
        quote.payNow > 0.02
          ? quote.projectedTotal
          : body.projectedTotalEur != null
            ? roundMoney(body.projectedTotalEur)
            : roundMoney((file.totalPriceEur || 0) + extrasDelta);
      const depositPaidEur =
        quote.payNow > 0.02
          ? quote.nextDepositPaidEur
          : body.depositPaidEur != null
            ? roundMoney(body.depositPaidEur)
            : paidNow
              ? roundMoney((file.depositPaidEur || 0) + extrasPayNow)
              : file.depositPaidEur;
      const nextBalance =
        quote.payNow > 0.02
          ? quote.nextBalanceDueEur
          : body.balanceDueEur != null
            ? roundMoney(body.balanceDueEur)
            : roundMoney(Math.max(0, totalPriceEur - depositPaidEur));

      // Apply dates, locations, extras, and totals immediately (not only pendingChanges).
      const updated = await updateFileBooking(file.id, {
        pickupAt,
        dropoffAt,
        bufferEndsAt: computeBufferEndsAt(new Date(dropoffAt)).toISOString(),
        ...(pickupIata ? { pickupAirportIata: pickupIata } : {}),
        ...(dropoffIata ? { dropoffAirportIata: dropoffIata } : {}),
        ...(replaceExtras || newExtras.length || paidNow ? { extras: nextExtras } : {}),
        totalPriceEur,
        depositPaidEur,
        balanceDueEur: nextBalance,
        pendingChanges: null,
        ...(paidNow && file.status === "PENDING" ? { status: "CONFIRMED" } : {}),
      });

      try {
        const { markPartnerBookingUpdated } = await import(
          "@/lib/server/partner-booking-update-store"
        );
        await markPartnerBookingUpdated(file.id);
      } catch {
        /* best-effort */
      }
      if (updated && file.status === "PENDING" && updated.status === "CONFIRMED") {
        void import("@/lib/server/partner-webhooks").then((m) =>
          m.dispatchBookingWebhook(updated, "booking.confirmed"),
        );
      }
      if (updated) {
        try {
          const { notifyFileBookingEvent } = await import("@/lib/notifications");
          await notifyFileBookingEvent(updated, "BOOKING_EDITED");
        } catch (notifyError) {
          console.warn("[bookings/guest-update] notify edited failed", notifyError);
        }
      }

      const refundable = roundMoney(Number(body.refundableSiteFeeEur) || 0);
      if (refundable > 0) {
        try {
          const { createBookingRefund } = await import(
            "@/lib/server/admin-booking-refunds-store"
          );
          const { normalizeRefundChanges, summarizeRefundChanges } = await import(
            "@/lib/bookings/refund-change-details"
          );
          const changes = normalizeRefundChanges(body.refundChanges);
          await createBookingRefund({
            bookingId: file.id,
            sequentialNumber: file.sequentialNumber || 0,
            guestFirstName: file.guestFirstName || "",
            guestLastName: file.guestLastName || "",
            guestEmail: file.guestEmail || email,
            guestPhone: file.guestPhone || "",
            amountEur: refundable,
            depositPercent: file.depositPercent || 0,
            reason: summarizeRefundChanges(changes) || "Booking correction refund",
            ...(changes.length ? { changes } : {}),
            paymentSource: "original-payment",
          });
        } catch (refundError) {
          console.warn("[bookings/guest-update] refund create", refundError);
        }
      }

      try {
        const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
        const detail = await loadBookingInfoDetail(file.id);
        if (detail) return NextResponse.json({ booking: detail, applied: true });
      } catch {
        /* fall through */
      }
      return NextResponse.json({ booking: updated, applied: true });
    }

    // Prisma path: apply dates + locations directly when email matches
    try {
      const { prisma } = await import("@/lib/prisma");
      const booking = await prisma.booking.findFirst({
        where: {
          id: body.bookingId,
          guestEmail: { equals: email, mode: "insensitive" },
        },
        include: {
          extras: { select: { extraServiceId: true, priceEur: true } },
          pickupAirport: { select: { iata: true } },
          dropoffAirport: { select: { iata: true } },
        },
      });
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      const pickupAt = body.pickupAt ? new Date(body.pickupAt) : booking.pickupAt;
      const dropoffAt = body.dropoffAt ? new Date(body.dropoffAt) : booking.dropoffAt;
      if (!(dropoffAt.getTime() > pickupAt.getTime())) {
        return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
      }
      if (body.pickupAt && pickupAt.getTime() !== booking.pickupAt.getTime()) {
        const { pickupInstantTooSoon } = await import("@/lib/bookings/lead-time");
        if (pickupInstantTooSoon(pickupAt)) {
          return NextResponse.json(
            { error: "Pickup must be at least 2 hours from now" },
            { status: 400 },
          );
        }
      }
      const newExtrasRaw = body.extras || [];
      const replaceExtras = body.replaceExtras === true;
      const extrasPayNow = Number(body.extrasPayNowEur) || 0;
      const paidNow = body.paymentMode === "sandbox" && extrasPayNow > 0;

      const rentalDays = Math.max(
        1,
        Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const { mergeMandatoryCatalogExtras } = await import("@/lib/server/booking-info-detail");
      const newExtras = replaceExtras
        ? await mergeMandatoryCatalogExtras(booking.carId, newExtrasRaw, rentalDays)
        : newExtrasRaw;

      const { quoteGuestBookingCorrection } = await import("@/lib/server/guest-correction-quote");
      const quote = await quoteGuestBookingCorrection({
        bookingId: booking.id,
        carId: booking.carId,
        promoCode: booking.promoCode,
        siteDiscountPercent: await readBookingSiteDiscount(booking.id),
        depositPercent: booking.depositPercent,
        totalPriceEur: Number(booking.totalPriceEur),
        depositPaidEur: Number(booking.depositPaidEur),
        balanceDueEur: Number(booking.balanceDueEur),
        oldPickupAt: booking.pickupAt.toISOString(),
        oldDropoffAt: booking.dropoffAt.toISOString(),
        newPickupAt: pickupAt.toISOString(),
        newDropoffAt: dropoffAt.toISOString(),
        oldPickupIata: booking.pickupAirport.iata,
        oldDropoffIata: booking.dropoffAirport.iata,
        newPickupIata: pickupIata || booking.pickupAirport.iata,
        newDropoffIata: dropoffIata || booking.dropoffAirport.iata,
        oldExtras: booking.extras.map((line) => ({
          id: line.extraServiceId,
          priceEur: Number(line.priceEur),
        })),
        newExtras,
      });
      const offeredPayNow = body.paymentMode === "sandbox" ? extrasPayNow : 0;
      if (quote.payNow > 0.02 && offeredPayNow + 0.05 < quote.payNow) {
        return NextResponse.json(
          { error: "Payment required for added days or services", payNowEur: quote.payNow },
          { status: 402 },
        );
      }

      let totalPriceEur = Number(booking.totalPriceEur);
      let depositPaidEur = Number(booking.depositPaidEur);
      if (quote.payNow > 0.02) {
        totalPriceEur = quote.projectedTotal;
        depositPaidEur = quote.nextDepositPaidEur;
      } else if (body.projectedTotalEur != null) {
        totalPriceEur = roundMoney(body.projectedTotalEur);
      } else if (paidNow || newExtras.length) {
        const extrasDelta = newExtras.reduce((s, e) => s + (Number(e.priceEur) || 0), 0);
        totalPriceEur = roundMoney(totalPriceEur + extrasDelta);
      }
      if (quote.payNow <= 0.02 && body.depositPaidEur != null) {
        depositPaidEur = roundMoney(body.depositPaidEur);
      } else if (quote.payNow <= 0.02 && paidNow) {
        depositPaidEur = roundMoney(depositPaidEur + extrasPayNow);
      }
      const balanceDueEur =
        quote.payNow > 0.02
          ? quote.nextBalanceDueEur
          : body.balanceDueEur != null
            ? roundMoney(body.balanceDueEur)
            : roundMoney(Math.max(0, totalPriceEur - depositPaidEur));

      if (replaceExtras || newExtras.length) {
        const catalogIds = new Set(
          (
            await prisma.carExtra.findMany({
              where: { carId: booking.carId },
              select: { extraServiceId: true },
            })
          ).map((r) => r.extraServiceId),
        );
        // On replace, keep secured list (includes mandatory). Otherwise only car catalog ids.
        const writeLines = replaceExtras
          ? newExtras
          : newExtras.filter((e) => catalogIds.has(e.id));
        if (replaceExtras) {
          await prisma.bookingExtra.deleteMany({ where: { bookingId: booking.id } });
        }
        if (writeLines.length) {
          await prisma.bookingExtra.createMany({
            data: writeLines.map((line) => ({
              bookingId: booking.id,
              extraServiceId: line.id,
              priceEur: line.priceEur,
              label: line.label.slice(0, 200),
            })),
            skipDuplicates: true,
          });
        }
      }

      const data: Record<string, unknown> = {
        pickupAt,
        dropoffAt,
        bufferEndsAt: computeBufferEndsAt(dropoffAt),
        totalPriceEur,
        depositPaidEur,
        balanceDueEur,
        ...(paidNow && booking.status === "PENDING" ? { status: "CONFIRMED" } : {}),
      };
      if (pickupIata) {
        const id = await resolveAirportId(pickupIata);
        if (id) data.pickupAirportId = id;
      }
      if (dropoffIata) {
        const id = await resolveAirportId(dropoffIata);
        if (id) data.dropoffAirportId = id;
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data,
      });
      if (booking.status === "PENDING" && updated.status === "CONFIRMED") {
        void import("@/lib/server/partner-webhooks").then((m) =>
          m.dispatchBookingWebhook(booking.id, "booking.confirmed"),
        );
      }

      try {
        const { markPartnerBookingUpdated } = await import(
          "@/lib/server/partner-booking-update-store"
        );
        await markPartnerBookingUpdated(booking.id);
      } catch {
        /* best-effort */
      }
      try {
        const { notifyBookingEvent } = await import("@/lib/notifications");
        await notifyBookingEvent(booking.id, "BOOKING_EDITED");
      } catch (notifyError) {
        console.warn("[bookings/guest-update] notify edited failed", notifyError);
      }

      const refundable = roundMoney(Number(body.refundableSiteFeeEur) || 0);
      if (refundable > 0) {
        try {
          const { createBookingRefund } = await import(
            "@/lib/server/admin-booking-refunds-store"
          );
          const { normalizeRefundChanges, summarizeRefundChanges } = await import(
            "@/lib/bookings/refund-change-details"
          );
          const changes = normalizeRefundChanges(body.refundChanges);
          await createBookingRefund({
            bookingId: booking.id,
            sequentialNumber: booking.sequentialNumber || 0,
            guestFirstName: booking.guestFirstName || "",
            guestLastName: booking.guestLastName || "",
            guestEmail: booking.guestEmail || email,
            guestPhone: booking.guestPhone || "",
            amountEur: refundable,
            depositPercent: booking.depositPercent || 0,
            reason: summarizeRefundChanges(changes) || "Booking correction refund",
            ...(changes.length ? { changes } : {}),
            paymentSource: "original-payment",
          });
        } catch (refundError) {
          console.warn("[bookings/guest-update] refund create prisma", refundError);
        }
      }

      try {
        const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
        const detail = await loadBookingInfoDetail(booking.id);
        if (detail) return NextResponse.json({ booking: detail, applied: true });
      } catch {
        /* fall through */
      }

      return NextResponse.json({
        booking: {
          id: updated.id,
          status: updated.status,
          pickupAt: updated.pickupAt.toISOString(),
          dropoffAt: updated.dropoffAt.toISOString(),
          totalPriceEur: Number(updated.totalPriceEur),
          depositPaidEur: Number(updated.depositPaidEur),
          balanceDueEur: Number(updated.balanceDueEur),
        },
        applied: true,
      });
    } catch (dbError) {
      console.warn("[bookings/guest-update] prisma", dbError);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[bookings/guest-update]", error);
    return NextResponse.json({ error: "Could not update booking" }, { status: 500 });
  }
}
