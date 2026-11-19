import { NextResponse } from "next/server";
import { z } from "zod";
import { formatBookingRef } from "@/lib/ids";
import {
  BogApiError,
  BogConfigError,
  createBogEcommerceOrder,
} from "@/lib/payments/bog-client";
import {
  bogCredentialsConfigured,
  getBogSiteUrl,
} from "@/lib/payments/bog-config";
import {
  attachBogOrderToBooking,
  getBookingForPayment,
} from "@/lib/server/booking-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bookingId: z.string().trim().min(1).max(80),
  locale: z.string().trim().max(8).optional(),
});

export async function POST(req: Request) {
  if (!bogCredentialsConfigured()) {
    return NextResponse.json(
      { error: "Bank of Georgia payments are not configured." },
      { status: 503 },
    );
  }

  const siteUrl = getBogSiteUrl();
  if (!siteUrl || !/^https:\/\//i.test(siteUrl)) {
    return NextResponse.json(
      {
        error:
          "SITE_URL (or NEXT_PUBLIC_SITE_URL) must be a public https origin for BOG redirects and callbacks.",
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

  const amount = Math.round(Math.max(0, booking.depositPaidEur) * 100) / 100;
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
    const order = await createBogEcommerceOrder({
      externalOrderId: booking.id,
      totalAmount: amount,
      currency: "EUR",
      basket: [
        {
          product_id: booking.id,
          description: `Car rental deposit ${ref}`.slice(0, 120),
          quantity: 1,
          unit_price: amount,
        },
      ],
      callbackUrl: `${siteUrl}/api/payments/bog/callback`,
      successRedirectUrl: `${siteUrl}/booking/payment/success?${q.toString()}`,
      failRedirectUrl: `${siteUrl}/booking/payment/fail?${q.toString()}`,
      locale: parsed.data.locale,
    });

    await attachBogOrderToBooking(booking.id, order.orderId);

    return NextResponse.json(
      {
        order_id: order.orderId,
        redirect_url: order.redirectUrl,
        bookingId: booking.id,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof BogConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof BogApiError) {
      console.error("[bog/create-order] API error", err.status, err.body);
      return NextResponse.json(
        { error: err.message || "Bank of Georgia rejected the payment order." },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error("[bog/create-order] unexpected", err);
    return NextResponse.json(
      { error: "Failed to create Bank of Georgia payment order." },
      { status: 500 },
    );
  }
}
