import { displayBookingCharges } from "@/lib/bookings/booking-money";
import { prisma } from "@/lib/prisma";
import { fullName, toNumber } from "@/lib/utils";
import { requirePartner } from "@/lib/auth/guards";
import { PartnerBookingsDashboard, type PartnerBookingDashRow } from "@/components/partner/partner-bookings-dashboard";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { normalizeLogin } from "@/lib/crypto";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { listFileBookingsForCars } from "@/lib/server/customer-bookings-store";
import { loadCarsByIds } from "@/lib/server/booking-car-label";
import { withBookedCarLabels } from "@/lib/server/booking-terms-store";
import { isDbOfflineError } from "@/lib/server/db-errors";

export default async function PartnerBookingsPage() {
  const session = await requirePartner();

  let rows: PartnerBookingDashRow[] = [];

  const email = normalizeLogin(session.user.email || "");
  const local = loadLocalPartner();
  const isLocal =
    session.user.id === LOCAL_PARTNER_ID ||
    (local != null &&
      (session.user.id === local.id ||
        (email && normalizeLogin(local.email) === email)));

  let partnerId: string | undefined;

  try {
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [{ userId: session.user.id }, ...(email ? [{ email }] : [])],
      },
      include: { _count: { select: { cars: true } } },
    });
    if (partner) {
      partnerId = partner.id;
      const bookings = await prisma.booking.findMany({
        where: { car: { partnerId: partner.id } },
        include: {
          car: {
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
        orderBy: [{ sequentialNumber: "desc" }, { createdAt: "desc" }],
        take: 200,
      });
      rows = bookings.map((b) => {
        const facing = displayBookingCharges({
          totalPriceEur: toNumber(b.totalPriceEur),
          depositPaidEur: toNumber(b.depositPaidEur),
          balanceDueEur: toNumber(b.balanceDueEur),
        });
        return {
          id: b.id,
          sequentialNumber: b.sequentialNumber || 0,
          status: b.status,
          guestFirstName: b.guestFirstName || "",
          guestLastName: b.guestLastName || "",
          guestName: fullName(b.guestFirstName, b.guestLastName),
          guestEmail: b.guestEmail || "",
          carLabel: `${b.car.make} ${b.car.model}`.trim(),
          carImageUrl: b.car.photos?.[0]?.url || null,
          createdAt: b.createdAt.toISOString(),
          pickupAt: b.pickupAt.toISOString(),
          dropoffAt: b.dropoffAt.toISOString(),
          totalPriceEur: toNumber(b.totalPriceEur),
          depositPaidEur: toNumber(b.depositPaidEur),
          balanceDueEur: facing.dueAtPickupEur,
          /** Always EUR — client converts with live top-bar currency. */
          listTotal: facing.tripEur,
          listDue: facing.dueAtPickupEur,
        };
      });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[partner-bookings] prisma", error);
    }
  }

  try {
    const fileCars = await listFileCarsForPartner({
      userId: session.user.id,
      email: session.user.email,
      partnerId: partnerId || (isLocal ? LOCAL_PARTNER_ID : undefined),
    });
    let prismaCarIds: string[] = [];
    if (partnerId) {
      try {
        const cars = await prisma.car.findMany({
          where: { partnerId },
          select: { id: true },
        });
        prismaCarIds = cars.map((car) => car.id);
      } catch {
        /* file cars still apply */
      }
    }
    const carIds = [...new Set([...fileCars.map((car) => car.id), ...prismaCarIds])];
    if (carIds.length) {
      const named = await loadCarsByIds(carIds);
      const fileFrom = new Date();
      fileFrom.setMonth(fileFrom.getMonth() - 18);
      const fileBookings = await listFileBookingsForCars(
        carIds,
        fileFrom,
        new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000),
        { includeCancelled: true },
      );
      const seen = new Set(rows.map((r) => r.id));
      for (const b of fileBookings) {
        if (seen.has(b.id)) continue;
        const car = named.get(b.carId);
        const facing = displayBookingCharges({
          totalPriceEur: toNumber(b.totalPriceEur),
          depositPaidEur: toNumber(b.depositPaidEur),
          balanceDueEur: toNumber(b.balanceDueEur),
        });
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
          createdAt: b.createdAt,
          pickupAt: b.pickupAt,
          dropoffAt: b.dropoffAt,
          totalPriceEur: toNumber(b.totalPriceEur),
          depositPaidEur: toNumber(b.depositPaidEur),
          balanceDueEur: facing.dueAtPickupEur,
          listTotal: facing.tripEur,
          listDue: facing.dueAtPickupEur,
        });
      }
    }
  } catch (error) {
    console.warn("[partner-bookings] file bookings", error);
  }

  rows.sort((a, b) => {
    const byNum = (b.sequentialNumber || 0) - (a.sequentialNumber || 0);
    if (byNum) return byNum;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <PartnerBookingsDashboard bookings={await withBookedCarLabels(rows)} />
    </div>
  );
}
