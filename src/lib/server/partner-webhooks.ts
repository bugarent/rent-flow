import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { formatBookingRef } from "@/lib/ids";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { assertPublicHttps } from "@/lib/server/channel-sync";
import { findWebhookForCarOwner } from "@/lib/server/partner-api-keys-store";
import type { FileBookingRecord } from "@/lib/server/customer-bookings-store";

export type PartnerWebhookEvent =
  | "booking.created"
  | "booking.confirmed"
  | "booking.updated"
  | "booking.cancelled"
  | "webhook.test";

export type PartnerWebhookPayload = {
  id: string;
  event: PartnerWebhookEvent;
  created_at: string;
  data: {
    booking_id: string;
    reference: string;
    status: string;
    vehicle_id: string;
    vehicle_external_id: string | null;
    start_date: string;
    end_date: string;
    pickup_location: string;
    dropoff_location: string;
    customer: { first_name: string; last_name: string; email: string; phone: string };
    total_price: number;
    paid_online: number;
    due_at_pickup: number;
    currency: "EUR";
  };
};

type Target = { url: string; secret: string };

export function signWebhookBody(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export async function postPartnerWebhook(target: Target, payload: PartnerWebhookPayload) {
  const url = await assertPublicHttps(target.url);
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const res = await fetch(url, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RentAirportCars-Webhook/1.0",
      "X-RAC-Event": payload.event,
      "X-RAC-Delivery": payload.id,
      "X-RAC-Timestamp": timestamp,
      "X-RAC-Signature": `sha256=${signWebhookBody(target.secret, timestamp, body)}`,
    },
    body,
  });
  return { ok: res.ok, status: res.status };
}

function money(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

async function externalIdForCar(description: string | null | undefined) {
  const { parseCarDetails } = await import("@/lib/cars/car-details");
  const value = String(parseCarDetails(description)?.externalId || "").trim();
  return value || null;
}

async function fromDbBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      pickupAirport: { select: { iata: true } },
      dropoffAirport: { select: { iata: true } },
      car: {
        select: {
          id: true,
          description: true,
          partner: { select: { id: true, email: true, userId: true } },
        },
      },
    },
  });
  if (!booking) return null;
  return {
    owner: {
      partnerId: booking.car.partner?.id,
      partnerUserId: booking.car.partner?.userId,
      partnerEmail: booking.car.partner?.email,
    },
    data: {
      booking_id: booking.id,
      reference: formatBookingRef(booking.sequentialNumber) || `#${booking.sequentialNumber}`,
      status: String(booking.status),
      vehicle_id: booking.car.id,
      vehicle_external_id: await externalIdForCar(booking.car.description),
      start_date: booking.pickupAt.toISOString(),
      end_date: booking.dropoffAt.toISOString(),
      pickup_location: booking.pickupAirport?.iata || booking.pickupAddress || "",
      dropoff_location: booking.dropoffAirport?.iata || booking.dropoffAddress || "",
      customer: {
        first_name: booking.guestFirstName,
        last_name: booking.guestLastName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
      },
      total_price: money(booking.totalPriceEur),
      paid_online: money(booking.depositPaidEur),
      due_at_pickup: money(booking.balanceDueEur),
      currency: "EUR" as const,
    },
  };
}

async function fromFileBooking(booking: FileBookingRecord) {
  const { getFileCar } = await import("@/lib/server/partner-cars-store");
  const car = await getFileCar(booking.carId);
  let owner: { partnerId?: string | null; partnerUserId?: string | null; partnerEmail?: string | null } = {
    partnerId: car?.partnerId,
    partnerUserId: car?.partnerUserId,
    partnerEmail: car?.partnerEmail,
  };
  let description = car?.description;
  if (!car) {
    try {
      const dbCar = await prisma.car.findUnique({
        where: { id: booking.carId },
        select: { description: true, partner: { select: { id: true, email: true, userId: true } } },
      });
      owner = {
        partnerId: dbCar?.partner?.id,
        partnerUserId: dbCar?.partner?.userId,
        partnerEmail: dbCar?.partner?.email,
      };
      description = dbCar?.description;
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }
  }
  return {
    owner,
    data: {
      booking_id: booking.id,
      reference: formatBookingRef(booking.sequentialNumber) || `#${booking.sequentialNumber}`,
      status: String(booking.status),
      vehicle_id: booking.carId,
      vehicle_external_id: await externalIdForCar(description),
      start_date: new Date(booking.pickupAt).toISOString(),
      end_date: new Date(booking.dropoffAt).toISOString(),
      pickup_location: booking.pickupAirportIata || booking.pickupAddress || "",
      dropoff_location: booking.dropoffAirportIata || booking.dropoffAddress || "",
      customer: {
        first_name: booking.guestFirstName,
        last_name: booking.guestLastName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
      },
      total_price: money(booking.totalPriceEur),
      paid_online: money(booking.depositPaidEur),
      due_at_pickup: money(booking.balanceDueEur),
      currency: "EUR" as const,
    },
  };
}

/** Best-effort: never throws, so a slow partner endpoint cannot break a booking. */
export async function dispatchBookingWebhook(
  booking: string | FileBookingRecord,
  event: Exclude<PartnerWebhookEvent, "webhook.test">,
) {
  try {
    let snapshot: Awaited<ReturnType<typeof fromFileBooking>> | null = null;
    if (typeof booking === "string") {
      try {
        snapshot = await fromDbBooking(booking);
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
      }
      if (!snapshot) {
        const { getFileBooking } = await import("@/lib/server/customer-bookings-store");
        const file = await getFileBooking(booking);
        if (file) snapshot = await fromFileBooking(file);
      }
    } else {
      snapshot = await fromFileBooking(booking);
    }
    if (!snapshot) return;
    const target = await findWebhookForCarOwner(snapshot.owner);
    if (!target) return;
    const result = await postPartnerWebhook(target, {
      id: randomUUID(),
      event,
      created_at: new Date().toISOString(),
      data: snapshot.data,
    });
    if (!result.ok) console.warn(`[webhook] ${event} → ${target.url} answered ${result.status}`);
  } catch (error) {
    console.warn(`[webhook] ${event} delivery failed`, error);
  }
}

export function sampleWebhookPayload(vehicleId = "car_123"): PartnerWebhookPayload {
  const start = new Date(Date.now() + 7 * 86_400_000);
  const end = new Date(start.getTime() + 3 * 86_400_000);
  return {
    id: randomUUID(),
    event: "webhook.test",
    created_at: new Date().toISOString(),
    data: {
      booking_id: "test-booking",
      reference: "TEST-0001",
      status: "CONFIRMED",
      vehicle_id: vehicleId,
      vehicle_external_id: null,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      pickup_location: "TBS",
      dropoff_location: "TBS",
      customer: { first_name: "Test", last_name: "Customer", email: "test@example.com", phone: "+995500000000" },
      total_price: 150,
      paid_online: 23.18,
      due_at_pickup: 127.5,
      currency: "EUR",
    },
  };
}
