import { after } from "next/server";
import { redirect } from "next/navigation";
import {
  PaypalApiError,
  capturePaypalCheckoutOrder,
} from "@/lib/payments/paypal-client";
import { getBookingForPayment, markBookingPaid } from "@/lib/server/booking-payment";
import { formatBookingRef } from "@/lib/ids";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] || "");
  return String(v || "");
}

/**
 * PayPal returns here with `token` = order id after the guest approves.
 * We capture the order, mark the booking paid, then send them to success/fail.
 */
export default async function PaypalPaymentReturnPage({ searchParams }: Props) {
  const sp = (await searchParams) || {};
  const token = first(sp.token).trim();
  const bookingIdParam = first(sp.bookingId).trim();
  const refParam = first(sp.ref).trim();

  const failQs = new URLSearchParams();
  if (bookingIdParam) failQs.set("bookingId", bookingIdParam);
  if (refParam) failQs.set("ref", refParam);
  failQs.set("provider", "paypal");

  if (!token) {
    redirect(`/booking/payment/fail?${failQs.toString()}`);
  }

  let bookingId = bookingIdParam;
  let paidOk = false;

  try {
    const captured = await capturePaypalCheckoutOrder(token);
    bookingId = (captured.customId || bookingIdParam).trim();
    paidOk =
      captured.status === "COMPLETED" ||
      captured.status === "CAPTURED" ||
      captured.status === "APPROVED";
  } catch (err) {
    if (err instanceof PaypalApiError) {
      console.error("[paypal/return] capture failed", err.status, err.message);
    } else {
      console.error("[paypal/return] unexpected", err);
    }
    redirect(`/booking/payment/fail?${failQs.toString()}`);
  }

  if (!paidOk || !bookingId) {
    redirect(`/booking/payment/fail?${failQs.toString()}`);
  }

  const booking = await getBookingForPayment(bookingId);
  if (!booking) {
    redirect(`/booking/payment/fail?${failQs.toString()}`);
  }

  const result = await markBookingPaid({
    bookingId: booking.id,
    provider: "paypal",
    orderId: token,
  });

  if (result.updated) {
    const paid = booking;
    after(() => {
      void (async () => {
        try {
          if (paid.source === "file") {
            const { getFileBooking } = await import("@/lib/server/customer-bookings-store");
            const { notifyFileBookingEvent } = await import("@/lib/notifications");
            const fileRow = await getFileBooking(paid.id);
            if (fileRow) await notifyFileBookingEvent(fileRow);
          } else {
            const { notifyBookingEvent } = await import("@/lib/notifications");
            await notifyBookingEvent(paid.id, "BOOKING_NEW");
          }
        } catch (notifyErr) {
          console.warn("[paypal/return] notify failed", notifyErr);
        }
      })();
    });
  }

  const successQs = new URLSearchParams({ bookingId: booking.id });
  const ref =
    refParam ||
    (booking.sequentialNumber != null
      ? formatBookingRef(booking.sequentialNumber) || ""
      : "");
  if (ref) successQs.set("ref", ref);
  if (booking.guestEmail) successQs.set("email", booking.guestEmail);
  redirect(`/booking/payment/success?${successQs.toString()}`);
}
