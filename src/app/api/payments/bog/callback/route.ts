import { NextResponse } from "next/server";
import { runAfterResponse } from "@/lib/server/after-response";
import { verifyBogCallbackSignature } from "@/lib/payments/bog-callback-verify";
import {
  findBookingByBogOrderId,
  getBookingForPayment,
  markBookingPaidFromBog,
  markBookingPaymentFailed,
} from "@/lib/server/booking-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BogCallbackPayload = {
  event?: string;
  body?: {
    order_id?: string;
    external_order_id?: string;
    order_status?: { key?: string; value?: string } | string;
  };
};

function orderStatusKey(raw: BogCallbackPayload["body"]): string {
  const status = raw?.order_status;
  if (!status) return "";
  if (typeof status === "string") return status.trim().toLowerCase();
  return String(status.key || "").trim().toLowerCase();
}

/**
 * BOG server-to-server payment notification.
 * Always acknowledges with HTTP 200 when the payload is processable so BOG does not retry forever.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("Callback-Signature") || req.headers.get("callback-signature");

  if (signature) {
    const ok = verifyBogCallbackSignature(rawBody, signature);
    if (!ok) {
      console.warn("[bog/callback] invalid Callback-Signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } else {
    console.warn("[bog/callback] missing Callback-Signature — processing carefully");
  }

  let payload: BogCallbackPayload | null = null;
  try {
    payload = JSON.parse(rawBody) as BogCallbackPayload;
  } catch {
    console.warn("[bog/callback] non-JSON body");
    return new NextResponse("OK", { status: 200 });
  }

  const body = payload?.body;
  const bogOrderId = String(body?.order_id || "").trim();
  const externalId = String(body?.external_order_id || "").trim();
  const statusKey = orderStatusKey(body);

  let booking =
    (externalId ? await getBookingForPayment(externalId) : null) ||
    (bogOrderId ? await findBookingByBogOrderId(bogOrderId) : null);

  if (!booking) {
    console.warn("[bog/callback] unknown order", { bogOrderId, externalId, statusKey });
    return new NextResponse("OK", { status: 200 });
  }

  try {
    if (statusKey === "completed") {
      const result = await markBookingPaidFromBog({
        bookingId: booking.id,
        bogOrderId: bogOrderId || booking.bogOrderId || "",
      });
      if (result.updated) {
        const paid = booking;
        runAfterResponse(async () => {
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
            console.warn("[bog/callback] notify failed", notifyErr);
          }
        });
      }
    } else if (statusKey === "rejected") {
      await markBookingPaymentFailed({
        bookingId: booking.id,
        bogOrderId: bogOrderId || undefined,
      });
    }
  } catch (err) {
    console.error("[bog/callback] update failed", err);
    // Still 200 — durable retry via Get Payment Details is preferred over BOG hammering.
  }

  return new NextResponse("OK", { status: 200 });
}
