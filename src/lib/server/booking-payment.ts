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
  sequentialNumber: number | null;
  status: string;
  depositPaidEur: number;
  guestEmail: string;
  guestFirstName: string;
  guestLastName: string;
  paymentProvider: string;
  paymentStatus: BookingPaymentStatus;
  bogOrderId: string | null;
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
    sequentialNumber: row.sequentialNumber,
    status: row.status,
    depositPaidEur: num(row.depositPaidEur),
    guestEmail: row.guestEmail,
    guestFirstName: row.guestFirstName,
    guestLastName: row.guestLastName,
    paymentProvider: String(row.paymentProvider || ""),
    paymentStatus: asPaymentStatus(row.paymentStatus),
    bogOrderId: row.bogOrderId || null,
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
        sequentialNumber: row.sequentialNumber,
        status: row.status,
        depositPaidEur: num(row.depositPaidEur),
        guestEmail: row.guestEmail,
        guestFirstName: row.guestFirstName,
        guestLastName: row.guestLastName,
        paymentProvider: String(row.paymentProvider || ""),
        paymentStatus: asPaymentStatus(row.paymentStatus),
        bogOrderId: row.bogOrderId || null,
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
        sequentialNumber: row.sequentialNumber,
        status: row.status,
        depositPaidEur: num(row.depositPaidEur),
        guestEmail: row.guestEmail,
        guestFirstName: row.guestFirstName,
        guestLastName: row.guestLastName,
        paymentProvider: String(row.paymentProvider || ""),
        paymentStatus: asPaymentStatus(row.paymentStatus),
        bogOrderId: row.bogOrderId || null,
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
  const id = bookingId.trim();
  const oid = bogOrderId.trim();
  if (!id || !oid) return;

  try {
    await prisma.booking.update({
      where: { id },
      data: {
        bogOrderId: oid,
        paymentProvider: "bog",
        paymentStatus: "PENDING",
      },
    });
  } catch (err) {
    console.warn("[booking-payment] prisma attachBogOrder failed", err);
  }

  try {
    await updateFileBooking(id, {
      bogOrderId: oid,
      paymentProvider: "bog",
      paymentStatus: "PENDING",
    });
  } catch {
    /* file booking may not exist */
  }
}

/**
 * Mark booking paid after BOG `completed`. Idempotent: no-op if already PAID.
 * Returns whether this call applied a new paid update.
 */
export async function markBookingPaidFromBog(params: {
  bookingId: string;
  bogOrderId: string;
}): Promise<{ updated: boolean; alreadyPaid: boolean }> {
  const existing = await getBookingForPayment(params.bookingId);
  if (!existing) {
    return { updated: false, alreadyPaid: false };
  }
  if (existing.paymentStatus === "PAID") {
    return { updated: false, alreadyPaid: true };
  }

  const bogOrderId = params.bogOrderId.trim() || existing.bogOrderId || null;

  try {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        paymentStatus: "PAID",
        paymentProvider: "bog",
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
      paymentProvider: "bog",
      ...(bogOrderId ? { bogOrderId } : {}),
      status: "CONFIRMED",
    });
  } catch {
    /* optional */
  }

  return { updated: true, alreadyPaid: false };
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
      ...(bogOrderId ? { bogOrderId } : {}),
    });
  } catch {
    /* optional */
  }
}
