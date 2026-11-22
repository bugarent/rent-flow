import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getFileBooking,
  updateFileBooking,
  type FileBookingRecord,
} from "@/lib/server/customer-bookings-store";

export type BookingPaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED";

export type BookingPaymentSnapshot = {
  id: string;
  carId: string;
  sequentialNumber: number | null;
  status: string;
  depositPaidEur: number;
  guestEmail: string;
  guestFirstName: string;
  guestLastName: string;
  paymentProvider: string;
  paymentStatus: BookingPaymentStatus;
  bogOrderId: string | null;
  paypalOrderId: string | null;
  source: "prisma" | "file";
};

function asPaymentStatus(raw: unknown): BookingPaymentStatus {
  const v = String(raw || "").trim().toUpperCase();
  if (v === "PENDING" || v === "PAID" || v === "FAILED" || v === "UNPAID") return v;
  return "UNPAID";
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fromFile(row: FileBookingRecord): BookingPaymentSnapshot {
  return {
    id: row.id,
    carId: row.carId,
    sequentialNumber: row.sequentialNumber,
    status: row.status,
    depositPaidEur: num(row.depositPaidEur),
    guestEmail: row.guestEmail,
    guestFirstName: row.guestFirstName,
    guestLastName: row.guestLastName,
    paymentProvider: String(row.paymentProvider || ""),
    paymentStatus: asPaymentStatus(row.paymentStatus),
    bogOrderId: row.bogOrderId || null,
    paypalOrderId: row.paypalOrderId || null,
    source: "file",
  };
}

export async function getBookingForPayment(
  bookingId: string,
): Promise<BookingPaymentSnapshot | null> {
  const id = bookingId.trim();
  if (!id) return null;

  try {
    const row = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        carId: true,
        sequentialNumber: true,
        status: true,
        depositPaidEur: true,
        guestEmail: true,
        guestFirstName: true,
        guestLastName: true,
        paymentProvider: true,
        paymentStatus: true,
        bogOrderId: true,
      },
    });
    if (row) {
      return {
        id: row.id,
        carId: row.carId,
        sequentialNumber: row.sequentialNumber,
        status: row.status,
        depositPaidEur: num(row.depositPaidEur),
        guestEmail: row.guestEmail,
        guestFirstName: row.guestFirstName,
        guestLastName: row.guestLastName,
        paymentProvider: String(row.paymentProvider || ""),
        paymentStatus: asPaymentStatus(row.paymentStatus),
        bogOrderId: row.bogOrderId || null,
        paypalOrderId: null,
        source: "prisma",
      };
    }
  } catch (err) {
    console.warn("[booking-payment] prisma find failed", err);
  }

  const file = await getFileBooking(id);
  return file ? fromFile(file) : null;
}

export async function findBookingByBogOrderId(
  bogOrderId: string,
): Promise<BookingPaymentSnapshot | null> {
  const oid = bogOrderId.trim();
  if (!oid) return null;

  try {
    const row = await prisma.booking.findFirst({
      where: { bogOrderId: oid },
      select: {
        id: true,
        carId: true,
        sequentialNumber: true,
        status: true,
        depositPaidEur: true,
        guestEmail: true,
        guestFirstName: true,
        guestLastName: true,
        paymentProvider: true,
        paymentStatus: true,
        bogOrderId: true,
      },
    });
    if (row) {
      return {
        id: row.id,
        carId: row.carId,
        sequentialNumber: row.sequentialNumber,
        status: row.status,
        depositPaidEur: num(row.depositPaidEur),
        guestEmail: row.guestEmail,
        guestFirstName: row.guestFirstName,
        guestLastName: row.guestLastName,
        paymentProvider: String(row.paymentProvider || ""),
        paymentStatus: asPaymentStatus(row.paymentStatus),
        bogOrderId: row.bogOrderId || null,
        paypalOrderId: null,
        source: "prisma",
      };
    }
  } catch (err) {
    console.warn("[booking-payment] prisma findByBogOrderId failed", err);
  }

  // File-store fallback: scan is rare (callback only)
  try {
    const { listAllFileBookings } = await import("@/lib/server/customer-bookings-store");
    const all = await listAllFileBookings();
    const hit = all.find((b) => b.bogOrderId === oid);
    return hit ? fromFile(hit) : null;
  } catch {
    return null;
  }
}

export async function attachBogOrderToBooking(
  bookingId: string,
  bogOrderId: string,
): Promise<void> {
  await attachPaymentOrderToBooking({
    bookingId,
    provider: "bog",
    orderId: bogOrderId,
  });
}

export async function attachPaymentOrderToBooking(params: {
  bookingId: string;
  provider: "bog" | "paypal";
  orderId: string;
}): Promise<void> {
  const id = params.bookingId.trim();
  const oid = params.orderId.trim();
  if (!id || !oid) return;

  try {
    await prisma.booking.update({
      where: { id },
      data: {
        paymentProvider: params.provider,
        paymentStatus: "PENDING",
        ...(params.provider === "bog" ? { bogOrderId: oid } : {}),
      },
    });
  } catch (err) {
    console.warn("[booking-payment] prisma attachPaymentOrder failed", err);
  }

  try {
    await updateFileBooking(id, {
      paymentProvider: params.provider,
      paymentStatus: "PENDING",
      ...(params.provider === "bog" ? { bogOrderId: oid } : { paypalOrderId: oid }),
    });
  } catch {
    /* file booking may not exist */
  }
}

/** Mark booking paid after a successful gateway capture/callback. Idempotent. */
export async function markBookingPaid(params: {
  bookingId: string;
  provider: "bog" | "paypal";
  orderId?: string;
}): Promise<{ updated: boolean; alreadyPaid: boolean }> {
  const existing = await getBookingForPayment(params.bookingId);
  if (!existing) return { updated: false, alreadyPaid: false };
  if (existing.paymentStatus === "PAID") return { updated: false, alreadyPaid: true };

  const bogOrderId =
    params.provider === "bog"
      ? params.orderId?.trim() || existing.bogOrderId || null
      : existing.bogOrderId;
  const paypalOrderId =
    params.provider === "paypal"
      ? params.orderId?.trim() || existing.paypalOrderId || null
      : existing.paypalOrderId;

  try {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        paymentStatus: "PAID",
        paymentProvider: params.provider,
        ...(bogOrderId ? { bogOrderId } : {}),
        status: "CONFIRMED",
      },
    });
  } catch (err) {
    console.warn("[booking-payment] prisma markPaid failed", err);
  }

  try {
    await updateFileBooking(existing.id, {
      paymentStatus: "PAID",
      paymentProvider: params.provider,
      ...(bogOrderId ? { bogOrderId } : {}),
      ...(paypalOrderId ? { paypalOrderId } : {}),
      status: "CONFIRMED",
    });
  } catch {
    /* optional */
  }

  return { updated: true, alreadyPaid: false };
}

/** Mark booking paid after BOG `completed`. Idempotent. */
export async function markBookingPaidFromBog(params: {
  bookingId: string;
  bogOrderId: string;
}): Promise<{ updated: boolean; alreadyPaid: boolean }> {
  return markBookingPaid({
    bookingId: params.bookingId,
    provider: "bog",
    orderId: params.bogOrderId,
  });
}

export async function markBookingPaymentFailed(params: {
  bookingId: string;
  bogOrderId?: string;
}): Promise<void> {
  const existing = await getBookingForPayment(params.bookingId);
  if (!existing || existing.paymentStatus === "PAID") return;

  const bogOrderId = params.bogOrderId?.trim() || existing.bogOrderId || null;

  try {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        paymentStatus: "FAILED",
        paymentProvider: "bog",
        status: "CANCELLED",
        cancelledAt: new Date(),
        ...(bogOrderId ? { bogOrderId } : {}),
      },
    });
  } catch (err) {
    console.warn("[booking-payment] prisma markFailed failed", err);
  }

  try {
    await updateFileBooking(existing.id, {
      paymentStatus: "FAILED",
      paymentProvider: "bog",
      status: "CANCELLED",
      cancelledAt: new Date().toISOString(),
      cancellationReason: "Payment not completed",
      ...(bogOrderId ? { bogOrderId } : {}),
    });
  } catch {
    /* optional */
  }

  try {
    const { clearAvailabilityCache } = await import("@/lib/server/cache/availability-cache");
    await clearAvailabilityCache();
  } catch {
    /* best-effort */
  }
}

/**
 * Cancel bog/paypal bookings that never reached PAID.
 * @param olderThanMs Only touch rows older than this (default 0 = all). Use a
 * short grace window when purging from admin so an in-flight bank redirect
 * is not cancelled under the guest's feet.
 */
export async function purgeUnpaidOnlineCheckouts(olderThanMs = 0): Promise<number> {
  let n = 0;
  const cutoff = new Date(Date.now() - Math.max(0, olderThanMs));
  try {
    const result = await prisma.booking.updateMany({
      where: {
        paymentProvider: { in: ["bog", "paypal"] },
        paymentStatus: { not: "PAID" },
        status: { in: ["PENDING", "CONFIRMED"] },
        ...(olderThanMs > 0 ? { createdAt: { lt: cutoff } } : {}),
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        paymentStatus: "FAILED",
      },
    });
    n += result.count;
  } catch (err) {
    console.warn("[booking-payment] purge prisma unpaid failed", err);
  }

  try {
    const { listAllFileBookings, updateFileBooking } = await import(
      "@/lib/server/customer-bookings-store"
    );
    const all = await listAllFileBookings();
    for (const row of all) {
      const provider = String(row.paymentProvider || "").toLowerCase();
      if (provider !== "bog" && provider !== "paypal") continue;
      if (String(row.paymentStatus || "").toUpperCase() === "PAID") continue;
      if (row.status !== "PENDING" && row.status !== "CONFIRMED") continue;
      if (olderThanMs > 0) {
        const created = new Date(row.createdAt).getTime();
        if (!Number.isFinite(created) || created > cutoff.getTime()) continue;
      }
      await updateFileBooking(row.id, {
        status: "CANCELLED",
        cancelledAt: new Date().toISOString(),
        cancellationReason: "Checkout abandoned before payment",
        paymentStatus: "FAILED",
      });
      n += 1;
    }
  } catch (err) {
    console.warn("[booking-payment] purge file unpaid failed", err);
  }

  if (n > 0) {
    try {
      const { clearAvailabilityCache } = await import("@/lib/server/cache/availability-cache");
      await clearAvailabilityCache();
    } catch {
      /* best-effort */
    }
  }
  return n;
}

/**
 * Guest abandoned checkout before the gateway charged/held funds.
 * Cancels the row so it never appears as an active booking.
 */
export async function discardUnpaidOnlineCheckout(bookingId: string): Promise<boolean> {
  const existing = await getBookingForPayment(bookingId);
  if (!existing) return false;
  if (existing.paymentStatus === "PAID") return false;
  const provider = String(existing.paymentProvider || "").trim().toLowerCase();
  if (provider !== "bog" && provider !== "paypal") return false;

  try {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        paymentStatus: "FAILED",
      },
    });
  } catch (err) {
    console.warn("[booking-payment] prisma discardUnpaid failed", err);
  }

  try {
    await updateFileBooking(existing.id, {
      status: "CANCELLED",
      cancelledAt: new Date().toISOString(),
      cancellationReason: "Checkout abandoned before payment",
      paymentStatus: "FAILED",
    });
  } catch {
    /* optional */
  }

  try {
    const { clearAvailabilityCache } = await import("@/lib/server/cache/availability-cache");
    await clearAvailabilityCache();
  } catch {
    /* best-effort */
  }

  return true;
}
