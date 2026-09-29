import { NextResponse } from "next/server";
import { z } from "zod";
import {
  commissionableTripEur,
  guestCancelSettlement,
} from "@/lib/bookings/guest-cancellation";
import { DEFAULT_DEPOSIT_PERCENT, roundMoney } from "@/lib/cars/reserve-pricing";

const schema = z.object({
  bookingId: z.string().min(1).max(80),
  email: z.string().trim().email().max(200),
  reason: z.string().trim().min(1).max(1000),
});

const CANCELLABLE = new Set(["PENDING", "CONFIRMED"]);

async function deliveryEurFor(bookingId: string): Promise<number> {
  try {
    const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
    const detail = await loadBookingInfoDetail(bookingId);
    return Number(detail?.delivery?.totalFeeEur) || 0;
  } catch {
    return 0;
  }
}

async function publishCancellation(input: {
  bookingId: string;
  sequentialNumber: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  depositPercent: number;
  reason: string;
  refundEur: number;
  commissionableEur: number;
}) {
  const { saveBookingCancelNote } = await import("@/lib/server/booking-cancel-notes");
  await saveBookingCancelNote(input.bookingId, input.reason);

  const refundEur = roundMoney(Math.max(0, input.refundEur));
  if (refundEur > 0) {
    try {
      const { createBookingRefund } = await import("@/lib/server/admin-booking-refunds-store");
      await createBookingRefund({
        bookingId: input.bookingId,
        sequentialNumber: input.sequentialNumber,
        guestFirstName: input.guestFirstName,
        guestLastName: input.guestLastName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        amountEur: refundEur,
        depositPercent: input.depositPercent,
        reason: `ჯავშნის გაუქმება — საიტის საკომისიოს დაბრუნება (${input.depositPercent}%). ${input.reason}`.slice(
          0,
          1000,
        ),
        changes: [
          {
            type: "extra",
            label: "ჯავშნის გაუქმება",
            priceFromEur: roundMoney(Math.max(0, input.commissionableEur)),
            priceToEur: 0,
            siteFeeShareEur: refundEur,
          },
        ],
        paymentSource: "original-payment",
      });
    } catch (refundError) {
      console.error("[bookings/guest-cancel] refund create failed", refundError);
    }
  }

  try {
    const { markPartnerBookingUpdated } = await import(
      "@/lib/server/partner-booking-update-store"
    );
    await markPartnerBookingUpdated(input.bookingId);
  } catch {
    /* best-effort */
  }
}

async function detailResponse(bookingId: string) {
  try {
    const { loadBookingInfoDetail } = await import("@/lib/server/booking-info-detail");
    const detail = await loadBookingInfoDetail(bookingId);
    if (detail) return NextResponse.json({ booking: detail });
  } catch {
    /* fall through */
  }
  return NextResponse.json({ booking: { id: bookingId, status: "CANCELLED" } });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const reason = body.reason.trim();

    const { getFileBooking, updateFileBooking } = await import(
      "@/lib/server/customer-bookings-store"
    );
    const file = await getFileBooking(body.bookingId);
    if (file && String(file.guestEmail || "").trim().toLowerCase() === email) {
      if (!CANCELLABLE.has(file.status)) {
        return NextResponse.json({ error: "Booking cannot be cancelled" }, { status: 409 });
      }
      const depositPercent =
        typeof file.depositPercent === "number" && Number.isFinite(file.depositPercent)
          ? Math.trunc(file.depositPercent)
          : DEFAULT_DEPOSIT_PERCENT;
      const deliveryEur = await deliveryEurFor(file.id);
      const extrasTotal = (file.extras || []).reduce(
        (s, e) => s + (Number(e.priceEur) || 0),
        0,
      );
      const bpPromo = Boolean(String(file.promoCode || "").trim());
      let commissionableEur = commissionableTripEur({
        totalPriceEur: file.totalPriceEur,
        depositPaidEur: file.depositPaidEur,
        deliveryEur,
      });
      let siteFeeEurOverride: number | undefined;
      if (bpPromo) {
        const { reconstructBpPreDiscountRental, bpCancelSiteFeeEur } = await import(
          "@/lib/business-partner/referral-pricing"
        );
        const rentalEur = reconstructBpPreDiscountRental({
          totalPriceEur: file.totalPriceEur,
          depositPaidEur: file.depositPaidEur,
          extrasEur: extrasTotal,
          deliveryEur,
        });
        commissionableEur = roundMoney(rentalEur + extrasTotal);
        siteFeeEurOverride = bpCancelSiteFeeEur({
          rentalEur,
          extrasEur: extrasTotal,
          deliveryEur,
          depositPercent,
        });
      }
      const settlement = guestCancelSettlement({
        pickupAt: file.pickupAt,
        extras: file.extras,
        depositPaidEur: file.depositPaidEur,
        depositPercent,
        commissionableEur,
        siteFeeEurOverride,
      });
      const updated = await updateFileBooking(file.id, {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
      });
      await publishCancellation({
        bookingId: file.id,
        sequentialNumber: file.sequentialNumber || 0,
        guestFirstName: file.guestFirstName || "",
        guestLastName: file.guestLastName || "",
        guestEmail: file.guestEmail || email,
        guestPhone: file.guestPhone || "",
        depositPercent,
        reason,
        refundEur: settlement.refundEur,
        commissionableEur,
      });
      try {
        const { notifyFileBookingEvent } = await import("@/lib/notifications");
        await notifyFileBookingEvent(updated || { ...file, status: "CANCELLED", cancellationReason: reason }, "BOOKING_CANCELLED", {
          cancellationReason: reason,
          refundEur: settlement.refundEur,
        });
      } catch (notifyError) {
        console.error("[bookings/guest-cancel] notify failed", notifyError);
      }
      return detailResponse(file.id);
    }

    try {
      const { prisma } = await import("@/lib/prisma");
      const booking = await prisma.booking.findFirst({
        where: {
          id: body.bookingId,
          guestEmail: { equals: email, mode: "insensitive" },
        },
        include: {
          extras: { select: { extraServiceId: true, id: true, priceEur: true } },
        },
      });
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      if (!CANCELLABLE.has(String(booking.status))) {
        return NextResponse.json({ error: "Booking cannot be cancelled" }, { status: 409 });
      }
      const depositPercent =
        typeof booking.depositPercent === "number" && Number.isFinite(booking.depositPercent)
          ? Math.trunc(booking.depositPercent)
          : DEFAULT_DEPOSIT_PERCENT;
      const depositPaidEur = Number(booking.depositPaidEur) || 0;
      const deliveryEur = await deliveryEurFor(booking.id);
      const extrasSum = (booking.extras || []).reduce(
        (s, e) => s + (Number(e.priceEur) || 0),
        0,
      );
      const bpPromo = Boolean(String(booking.promoCode || "").trim());
      let commissionableEur = commissionableTripEur({
        totalPriceEur: Number(booking.totalPriceEur) || 0,
        depositPaidEur,
        deliveryEur,
      });
      let siteFeeEurOverride: number | undefined;
      if (bpPromo) {
        const { reconstructBpPreDiscountRental, bpCancelSiteFeeEur } = await import(
          "@/lib/business-partner/referral-pricing"
        );
        const rentalEur = reconstructBpPreDiscountRental({
          totalPriceEur: Number(booking.totalPriceEur) || 0,
          depositPaidEur,
          extrasEur: extrasSum,
          deliveryEur,
        });
        commissionableEur = roundMoney(rentalEur + extrasSum);
        siteFeeEurOverride = bpCancelSiteFeeEur({
          rentalEur,
          extrasEur: extrasSum,
          deliveryEur,
          depositPercent,
        });
      }
      const settlement = guestCancelSettlement({
        pickupAt: booking.pickupAt.toISOString(),
        extras: (booking.extras || []).map((extra) => ({
          id: extra.extraServiceId || extra.id,
        })),
        depositPaidEur,
        depositPercent,
        commissionableEur,
        siteFeeEurOverride,
      });
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await publishCancellation({
        bookingId: booking.id,
        sequentialNumber: booking.sequentialNumber || 0,
        guestFirstName: booking.guestFirstName || "",
        guestLastName: booking.guestLastName || "",
        guestEmail: booking.guestEmail || email,
        guestPhone: booking.guestPhone || "",
        depositPercent,
        reason,
        refundEur: settlement.refundEur,
        commissionableEur,
      });
      try {
        const { notifyBookingEvent } = await import("@/lib/notifications");
        await notifyBookingEvent(booking.id, "BOOKING_CANCELLED", {
          cancellationReason: reason,
          refundEur: settlement.refundEur,
        });
      } catch (notifyError) {
        console.error("[bookings/guest-cancel] notify failed", notifyError);
      }
      return detailResponse(booking.id);
    } catch (dbError) {
      console.warn("[bookings/guest-cancel] prisma", dbError);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[bookings/guest-cancel]", error);
    return NextResponse.json({ error: "Could not cancel booking" }, { status: 500 });
  }
}
