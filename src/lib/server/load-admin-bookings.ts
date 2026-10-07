import "server-only";

import { formatBookingRef } from "@/lib/ids";
import { fullName, toNumber } from "@/lib/utils";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listAllFileBookings } from "@/lib/server/customer-bookings-store";
import { loadCarsByIds } from "@/lib/server/booking-car-label";
import { withBookedCarLabels } from "@/lib/server/booking-terms-store";
import {
  businessPartnerCodeForBooking,
  loadBusinessPartnerCodeIndex,
} from "@/lib/server/business-partner-booking-codes";

export type AdminBookingListRow = {
  id: string;
  sequentialNumber: number;
  status: string;
  guestFirstName: string;
  guestLastName: string;
  guestName: string;
  guestEmail: string;
  carLabel: string;
  carImageUrl?: string | null;
  partnerLabel: string;
  createdAt: string;
  pickupAt: string;
  dropoffAt: string;
  totalPriceEur: number;
  depositPaidEur: number;
  /** Set when the guest booked with a business-partner code or QR. */
  businessPartnerCode: string;
};

export async function loadAdminBookingRows(): Promise<AdminBookingListRow[]> {
  const rows: AdminBookingListRow[] = [];
  const partnerCodes = await loadBusinessPartnerCodeIndex().catch(() => ({
    known: new Set<string>(),
    byRef: new Map<string, string>(),
  }));

  try {
    const { prisma } = await import("@/lib/prisma");
    const bookings = await prisma.booking.findMany({
      include: {
        car: {
          include: {
            partner: { select: { companyName: true, email: true } },
            photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: [{ sequentialNumber: "desc" }, { createdAt: "desc" }],
    });
    for (const b of bookings) {
      rows.push({
        id: b.id,
        sequentialNumber: b.sequentialNumber || 0,
        status: b.status,
        guestFirstName: b.guestFirstName || "",
        guestLastName: b.guestLastName || "",
        guestName: fullName(b.guestFirstName, b.guestLastName),
        guestEmail: b.guestEmail || "",
        carLabel: `${b.car.make} ${b.car.model}`.trim(),
        carImageUrl: b.car.photos?.[0]?.url || null,
        partnerLabel: b.car.partner?.companyName || b.car.partner?.email || "",
        createdAt: b.createdAt.toISOString(),
        pickupAt: b.pickupAt.toISOString(),
        dropoffAt: b.dropoffAt.toISOString(),
        totalPriceEur: toNumber(b.totalPriceEur),
        depositPaidEur: toNumber(b.depositPaidEur),
        businessPartnerCode: businessPartnerCodeForBooking(partnerCodes, {
          promoCode: b.promoCode,
          bookingRef: formatBookingRef(b.sequentialNumber) || b.id,
        }),
      });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin-bookings] prisma", error);
    }
  }

  try {
    const fileBookings = await listAllFileBookings();
    const byId = await loadCarsByIds(fileBookings.map((b) => b.carId));
    const seen = new Set(rows.map((r) => r.id));
    for (const b of fileBookings) {
      if (seen.has(b.id)) continue;
      const car = byId.get(b.carId);
      rows.push({
        id: b.id,
        sequentialNumber: b.sequentialNumber || 0,
        status: b.status,
        guestFirstName: b.guestFirstName || "",
        guestLastName: b.guestLastName || "",
        guestName: fullName(b.guestFirstName, b.guestLastName),
        guestEmail: b.guestEmail || "",
        carLabel: car?.label || "—",
        carImageUrl: car?.imageUrl || null,
        partnerLabel: car?.partnerLabel || "",
        createdAt: b.createdAt,
        pickupAt: b.pickupAt,
        dropoffAt: b.dropoffAt,
        totalPriceEur: toNumber(b.totalPriceEur),
        depositPaidEur: toNumber(b.depositPaidEur),
        businessPartnerCode: businessPartnerCodeForBooking(partnerCodes, {
          promoCode: b.promoCode,
          bookingRef: formatBookingRef(b.sequentialNumber) || b.id,
        }),
      });
    }
  } catch (error) {
    console.warn("[admin-bookings] file", error);
  }

  rows.sort((a, b) => {
    const byNum = (b.sequentialNumber || 0) - (a.sequentialNumber || 0);
    if (byNum) return byNum;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return withBookedCarLabels(rows);
}
