import { NextResponse } from "next/server";
import { z } from "zod";
import { formatBookingRef } from "@/lib/ids";
import {
  PaypalApiError,
  PaypalConfigError,
  createPaypalCheckoutOrder,
} from "@/lib/payments/paypal-client";
import { paypalCredentialsConfigured } from "@/lib/payments/paypal-config";
import { getBogSiteUrl } from "@/lib/payments/bog-config";
import {
  attachPaymentOrderToBooking,
  getBookingForPayment,
} from "@/lib/server/booking-payment";
import { roundMoney } from "@/lib/cars/reserve-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bookingId: z.string().trim().min(1).max(80),
});

export async function POST(req: Request) {
  if (!paypalCredentialsConfigured()) {
    return NextResponse.json(
      { error: "PayPal payments are not configured." },
      { status: 503 },
    );
  }

  const siteUrl = getBogSiteUrl();
  if (!siteUrl || !/^https:\/\//i.test(siteUrl)) {
    return NextResponse.json(
      {
        error:
          "SITE_URL (or NEXT_PUBLIC_SITE_URL) must be a public https origin for PayPal return URLs.",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }

  const booking = await getBookingForPayment(parsed.data.bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "This booking is already paid.", paymentStatus: "PAID" },
      { status: 409 },
    );
  }

  const amount = roundMoney(Math.max(0, booking.depositPaidEur));
  if (!(amount > 0)) {
    return NextResponse.json(
      { error: "Nothing to charge for this booking." },
      { status: 400 },
    );
  }

  const ref =
    booking.sequentialNumber != null
      ? formatBookingRef(booking.sequentialNumber) || booking.id
      : booking.id;
  const q = new URLSearchParams({
    bookingId: booking.id,
    ...(booking.sequentialNumber != null
      ? { ref: String(formatBookingRef(booking.sequentialNumber) || "") }
      : {}),
  });

  try {
    const order = await createPaypalCheckoutOrder({
      intent: "CAPTURE",
      amount: amount.toFixed(2),
      currency: "EUR",
      description: `Car rental deposit ${ref}`.slice(0, 127),
      customId: booking.id,
      returnUrl: `${siteUrl}/booking/payment/paypal/return?${q.toString()}`,
      cancelUrl: `${siteUrl}/booking/payment/fail?${q.toString()}&provider=paypal`,
    });

    if (!order.approveUrl) {
      return NextResponse.json(
        { error: "PayPal did not return an approval URL." },
        { status: 502 },
      );
    }

    await attachPaymentOrderToBooking({
      bookingId: booking.id,
      provider: "paypal",
      orderId: order.id,
    });

    return NextResponse.json(
      {
        order_id: order.id,
        redirect_url: order.approveUrl,
        bookingId: booking.id,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof PaypalConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof PaypalApiError) {
      console.error("[paypal/create-order] API error", err.status, err.message);
      return NextResponse.json(
        { error: err.message || "PayPal rejected the payment order." },
        { status: 502 },
      );
    }
    console.error("[paypal/create-order] unexpected", err);
    return NextResponse.json(
      { error: "Failed to create PayPal payment order." },
      { status: 500 },
    );
  }
}
