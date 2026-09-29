import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { computeBufferEndsAt } from "@/lib/calendar/buffer";
import {
  deleteFileBooking,
  getFileBooking,
  updateFileBooking,
} from "@/lib/server/customer-bookings-store";
import { loadBookingInfoDetail } from "@/lib/server/booking-info-detail";
import { archiveBookingForReports } from "@/lib/server/admin-booking-facts";
import { roundMoney } from "@/lib/cars/reserve-pricing";

async function requireAdmin() {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const booking = await loadBookingInfoDetail(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  const pickupAt = body.pickupAt ? new Date(String(body.pickupAt)) : null;
  const dropoffAt = body.dropoffAt ? new Date(String(body.dropoffAt)) : null;
  if (pickupAt && dropoffAt) {
    if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropoffAt.getTime()) || dropoffAt <= pickupAt) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
  }

  const applyPendingExtras = body.applyPendingExtras === true;

  const guestFirstName =
    typeof body.guestFirstName === "string" ? body.guestFirstName.trim() : undefined;
  const guestLastName =
    typeof body.guestLastName === "string" ? body.guestLastName.trim() : undefined;
  const guestEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim() : undefined;
  const guestPhone = typeof body.guestPhone === "string" ? body.guestPhone.trim() : undefined;
  const pickupAirportIata =
    typeof body.pickupAirportIata === "string"
      ? body.pickupAirportIata.trim().toUpperCase()
      : undefined;
  const dropoffAirportIata =
    typeof body.dropoffAirportIata === "string"
      ? body.dropoffAirportIata.trim().toUpperCase()
      : undefined;
  const extrasPatch = Array.isArray(body.extras)
    ? body.extras
        .map((row: unknown) => {
          if (!row || typeof row !== "object") return null;
          const r = row as { id?: unknown; label?: unknown; priceEur?: unknown; qty?: unknown };
          const id = String(r.id || "").trim();
          if (!id) return null;
          return {
            id,
            label: String(r.label || id).trim() || id,
            priceEur: Number(r.priceEur) || 0,
            ...(r.qty != null && Number.isFinite(Number(r.qty)) ? { qty: Number(r.qty) } : {}),
          };
        })
        .filter(Boolean)
    : undefined;
  const status =
    body.status === "PENDING" ||
    body.status === "CONFIRMED" ||
    body.status === "COMPLETED" ||
    body.status === "CANCELLED" ||
    body.status === "UNFULFILLED"
      ? body.status
      : undefined;
  const totalPriceEur =
    body.totalPriceEur != null && Number.isFinite(Number(body.totalPriceEur))
      ? Number(body.totalPriceEur)
      : undefined;
  const depositPaidEur =
    body.depositPaidEur != null && Number.isFinite(Number(body.depositPaidEur))
      ? Number(body.depositPaidEur)
      : undefined;
  const balanceDueEurFromBody =
    body.balanceDueEur != null && Number.isFinite(Number(body.balanceDueEur))
      ? Number(body.balanceDueEur)
      : undefined;
  const refundableSiteFeeEur =
    body.refundableSiteFeeEur != null && Number.isFinite(Number(body.refundableSiteFeeEur))
      ? Number(body.refundableSiteFeeEur)
      : 0;
  const { normalizeRefundChanges, summarizeRefundChanges } = await import(
    "@/lib/bookings/refund-change-details"
  );
  const refundChanges = normalizeRefundChanges(body.refundChanges);

  try {
    let dbBooking: { id: string; carId: string } | null = null;
    try {
      const found = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, carId: true },
      });
      dbBooking = found;
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    if (!dbBooking) {
      const fileBooking = await getFileBooking(id);
      if (!fileBooking) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const pending = fileBooking.pendingChanges;
      const nextPickup = pickupAt || (pending?.pickupAt ? new Date(pending.pickupAt) : null);
      const nextDropoff = dropoffAt || (pending?.dropoffAt ? new Date(pending.dropoffAt) : null);
      if (nextPickup && nextDropoff) {
        const { carHasBookingConflict } = await import("@/lib/server/car-availability");
        if (
          await carHasBookingConflict(fileBooking.carId, nextPickup, nextDropoff, {
            excludeBookingId: id,
          })
        ) {
          return NextResponse.json({ error: "Dates conflict with another booking" }, { status: 409 });
        }
      }

      let nextExtras = fileBooking.extras || [];
      let nextTotal = totalPriceEur ?? fileBooking.totalPriceEur;
      let nextDeposit = depositPaidEur ?? fileBooking.depositPaidEur;
      if (extrasPatch) {
        const rentalDays = Math.max(
          1,
          Math.ceil(
            ((nextDropoff || new Date(fileBooking.dropoffAt)).getTime() -
              (nextPickup || new Date(fileBooking.pickupAt)).getTime()) /
              (24 * 60 * 60 * 1000),
          ),
        );
        const { mergeMandatoryCatalogExtras } = await import("@/lib/server/booking-info-detail");
        const secured = await mergeMandatoryCatalogExtras(
          fileBooking.carId,
          extrasPatch as Array<{ id: string; label: string; priceEur: number; qty?: number }>,
          rentalDays,
        );
        const prevExtrasSum = (fileBooking.extras || []).reduce(
          (s, e) => s + (Number(e.priceEur) || 0),
          0,
        );
        const nextExtrasSum = secured.reduce((s, e) => s + (Number(e.priceEur) || 0), 0);
        nextExtras = secured as typeof nextExtras;
        nextTotal =
          totalPriceEur ??
          roundMoney((fileBooking.totalPriceEur || 0) - prevExtrasSum + nextExtrasSum);
      }
      if (applyPendingExtras && pending?.extras?.length) {
        const merged = [...nextExtras];
        let extrasDelta = 0;
        for (const line of pending.extras) {
          if (!merged.some((e) => e.id === line.id)) {
            merged.push(line);
            extrasDelta += Number(line.priceEur) || 0;
          }
        }
        nextExtras = merged;
        nextTotal = roundMoney(nextTotal + extrasDelta);
        if (pending.extrasPayNowEur && pending.extrasPayNowEur > 0) {
          nextDeposit = roundMoney(nextDeposit + pending.extrasPayNowEur);
        }
      }

      const bufferEndsAt =
        nextPickup && nextDropoff
          ? computeBufferEndsAt(nextDropoff).toISOString()
          : undefined;
      const balanceDueEur = roundMoney(
        Math.max(
          0,
          balanceDueEurFromBody != null
            ? balanceDueEurFromBody
            : nextTotal - nextDeposit,
        ),
      );
      const pendingPickupIata = pending?.pickupAirportIata
        ? String(pending.pickupAirportIata).toUpperCase()
        : undefined;
      const pendingDropoffIata = pending?.dropoffAirportIata
        ? String(pending.dropoffAirportIata).toUpperCase()
        : undefined;
      const updated = await updateFileBooking(id, {
        ...(guestFirstName != null ? { guestFirstName } : {}),
        ...(guestLastName != null ? { guestLastName } : {}),
        ...(guestEmail != null ? { guestEmail } : {}),
        ...(guestPhone != null ? { guestPhone } : {}),
        ...(status ? { status } : {}),
        ...(nextPickup ? { pickupAt: nextPickup.toISOString() } : {}),
        ...(nextDropoff ? { dropoffAt: nextDropoff.toISOString() } : {}),
        ...(bufferEndsAt ? { bufferEndsAt } : {}),
        ...(pickupAirportIata
          ? { pickupAirportIata }
          : applyPendingExtras && pendingPickupIata
            ? { pickupAirportIata: pendingPickupIata }
            : {}),
        ...(dropoffAirportIata
          ? { dropoffAirportIata }
          : applyPendingExtras && pendingDropoffIata
            ? { dropoffAirportIata: pendingDropoffIata }
            : {}),
        ...(applyPendingExtras
          ? { extras: nextExtras, totalPriceEur: nextTotal, depositPaidEur: nextDeposit }
          : {
              ...(extrasPatch ? { extras: nextExtras, totalPriceEur: nextTotal } : {}),
              ...(totalPriceEur != null ? { totalPriceEur } : {}),
              ...(depositPaidEur != null ? { depositPaidEur } : {}),
            }),
        ...(totalPriceEur != null ||
        depositPaidEur != null ||
        applyPendingExtras ||
        extrasPatch ||
        pickupAirportIata ||
        dropoffAirportIata ||
        nextPickup ||
        nextDropoff
          ? { balanceDueEur }
          : {}),
        // Admin save applies live fields — clear any stale guest pending request.
        ...(applyPendingExtras ||
        pickupAirportIata ||
        dropoffAirportIata ||
        nextPickup ||
        nextDropoff ||
        extrasPatch ||
        totalPriceEur != null
          ? { pendingChanges: null }
          : {}),
      });
      const meaningfulChange = Boolean(
        applyPendingExtras ||
          pickupAirportIata ||
          dropoffAirportIata ||
          nextPickup ||
          nextDropoff ||
          extrasPatch ||
          totalPriceEur != null ||
          depositPaidEur != null,
      );
      if (meaningfulChange) {
        try {
          const { markPartnerBookingUpdated } = await import(
            "@/lib/server/partner-booking-update-store"
          );
          await markPartnerBookingUpdated(id);
        } catch {
          /* best-effort */
        }
        if (updated) {
          try {
            const { notifyFileBookingEvent } = await import("@/lib/notifications");
            await notifyFileBookingEvent(updated, "BOOKING_EDITED");
          } catch (notifyError) {
            console.warn("[admin/bookings] notify edited failed", notifyError);
          }
        }
      }
      if (refundableSiteFeeEur > 0) {
        try {
          const { createBookingRefund } = await import(
            "@/lib/server/admin-booking-refunds-store"
          );
          await createBookingRefund({
            bookingId: id,
            sequentialNumber: updated?.sequentialNumber || fileBooking.sequentialNumber || 0,
            guestFirstName: updated?.guestFirstName || fileBooking.guestFirstName || "",
            guestLastName: updated?.guestLastName || fileBooking.guestLastName || "",
            guestEmail: updated?.guestEmail || fileBooking.guestEmail || "",
            guestPhone: updated?.guestPhone || fileBooking.guestPhone || "",
            amountEur: refundableSiteFeeEur,
            depositPercent: fileBooking.depositPercent || 0,
            reason: summarizeRefundChanges(refundChanges) || "Admin booking correction refund",
            ...(refundChanges.length ? { changes: refundChanges } : {}),
            paymentSource: "original-payment",
          });
        } catch (refundError) {
          console.warn("[admin/bookings] refund create", refundError);
        }
      }
      const detail = await loadBookingInfoDetail(id);
      return NextResponse.json({ booking: detail || updated });
    }

    if (pickupAt && dropoffAt) {
      const { carHasBookingConflict } = await import("@/lib/server/car-availability");
      if (
        await carHasBookingConflict(dbBooking.carId, pickupAt, dropoffAt, {
          excludeBookingId: dbBooking.id,
        })
      ) {
        return NextResponse.json({ error: "Dates conflict with another booking" }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (guestFirstName != null) data.guestFirstName = guestFirstName;
    if (guestLastName != null) data.guestLastName = guestLastName;
    if (guestEmail != null) data.guestEmail = guestEmail;
    if (guestPhone != null) data.guestPhone = guestPhone;
    if (status) {
      data.status = status;
      if (status === "CANCELLED") data.cancelledAt = new Date();
      if (status === "COMPLETED") data.completedAt = new Date();
    }
    if (pickupAt && dropoffAt) {
      data.pickupAt = pickupAt;
      data.dropoffAt = dropoffAt;
      data.bufferEndsAt = computeBufferEndsAt(dropoffAt);
    }
    if (pickupAirportIata) {
      try {
        const airport = await prisma.airport.findFirst({
          where: { iata: pickupAirportIata },
          select: { id: true },
        });
        if (airport) data.pickupAirportId = airport.id;
      } catch {
        /* ignore when offline */
      }
    }
    if (dropoffAirportIata) {
      try {
        const airport = await prisma.airport.findFirst({
          where: { iata: dropoffAirportIata },
          select: { id: true },
        });
        if (airport) data.dropoffAirportId = airport.id;
      } catch {
        /* ignore when offline */
      }
    }
    if (totalPriceEur != null) data.totalPriceEur = totalPriceEur;
    if (depositPaidEur != null) {
      data.depositPaidEur = depositPaidEur;
      if (totalPriceEur != null) {
        data.balanceDueEur = Number((totalPriceEur - depositPaidEur).toFixed(2));
      }
    }

    const updated = await prisma.booking.update({
      where: { id: dbBooking.id },
      data,
      select: {
        id: true,
        sequentialNumber: true,
        status: true,
        guestFirstName: true,
        guestLastName: true,
        guestEmail: true,
        pickupAt: true,
        dropoffAt: true,
        totalPriceEur: true,
        depositPaidEur: true,
      },
    });

    const meaningfulChange = Boolean(
      pickupAt ||
        dropoffAt ||
        pickupAirportIata ||
        dropoffAirportIata ||
        extrasPatch ||
        totalPriceEur != null ||
        depositPaidEur != null ||
        applyPendingExtras,
    );
    if (meaningfulChange) {
      try {
        const { markPartnerBookingUpdated } = await import(
          "@/lib/server/partner-booking-update-store"
        );
        await markPartnerBookingUpdated(dbBooking.id);
      } catch {
        /* best-effort */
      }
      try {
        const { notifyBookingEvent } = await import("@/lib/notifications");
        await notifyBookingEvent(dbBooking.id, "BOOKING_EDITED");
      } catch (notifyError) {
        console.warn("[admin/bookings] notify edited failed", notifyError);
      }
    }

    if (refundableSiteFeeEur > 0) {
      try {
        const { createBookingRefund } = await import(
          "@/lib/server/admin-booking-refunds-store"
        );
        const full = await prisma.booking.findUnique({
          where: { id: dbBooking.id },
          select: {
            sequentialNumber: true,
            guestFirstName: true,
            guestLastName: true,
            guestEmail: true,
            guestPhone: true,
            depositPercent: true,
          },
        });
        await createBookingRefund({
          bookingId: dbBooking.id,
          sequentialNumber: full?.sequentialNumber || updated.sequentialNumber || 0,
          guestFirstName: full?.guestFirstName || updated.guestFirstName || "",
          guestLastName: full?.guestLastName || updated.guestLastName || "",
          guestEmail: full?.guestEmail || updated.guestEmail || "",
          guestPhone: full?.guestPhone || "",
          amountEur: refundableSiteFeeEur,
          depositPercent: full?.depositPercent || 0,
          reason: summarizeRefundChanges(refundChanges) || "Admin booking correction refund",
          ...(refundChanges.length ? { changes: refundChanges } : {}),
          paymentSource: "original-payment",
        });
      } catch (refundError) {
        console.warn("[admin/bookings] refund create prisma", refundError);
      }
    }

    return NextResponse.json({
      booking: {
        ...updated,
        totalPriceEur: Number(updated.totalPriceEur),
        depositPaidEur: Number(updated.depositPaidEur),
        pickupAt: updated.pickupAt.toISOString(),
        dropoffAt: updated.dropoffAt.toISOString(),
      },
    });
  } catch (error) {
    if (isDbOfflineError(error)) {
      return NextResponse.json({ error: "Database offline" }, { status: 503 });
    }
    console.error("[admin/bookings PATCH]", error);
    return NextResponse.json({ error: "Could not update booking" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    await archiveBookingForReports(id);
    let removed = false;
    try {
      const found = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
      if (found) {
        await prisma.booking.delete({ where: { id: found.id } });
        removed = true;
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    if (await deleteFileBooking(id)) removed = true;
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDbOfflineError(error)) {
      try {
        await archiveBookingForReports(id);
      } catch (archiveError) {
        console.warn("[admin/bookings DELETE] archive", archiveError);
      }
      const fileOk = await deleteFileBooking(id);
      if (fileOk) return NextResponse.json({ ok: true });
      return NextResponse.json({ error: "Database offline" }, { status: 503 });
    }
    console.error("[admin/bookings DELETE]", error);
    return NextResponse.json({ error: "Could not delete booking" }, { status: 500 });
  }
}
