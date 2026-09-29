import "server-only";

import { buildIcalCalendar, type IcalEvent } from "@/lib/channel/ical";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { computeBufferEndsAt } from "@/lib/calendar/buffer";
import { listCalendarBlocksForCars } from "@/lib/server/car-calendar-blocks-store";
import { formatBookingRef } from "@/lib/ids";

export async function buildCarChannelIcal(carId: string, carLabel: string) {
  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const to = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
  const events: IcalEvent[] = [];

  try {
    const rows = await prisma.booking.findMany({
      where: {
        carId,
        status: { in: ["PENDING", "CONFIRMED"] },
        bufferEndsAt: { gt: from },
        pickupAt: { lt: to },
      },
      select: { id: true, sequentialNumber: true, pickupAt: true, bufferEndsAt: true },
    });
    for (const row of rows) {
      events.push({
        uid: `booking-${row.id}@rentairportcars.com`,
        summary: `RentAirportCars ${formatBookingRef(row.sequentialNumber) || row.id}`,
        start: row.pickupAt.toISOString(),
        end: row.bufferEndsAt.toISOString(),
      });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  try {
    const { listFileBookingsForCars } = await import("@/lib/server/customer-bookings-store");
    const fileRows = await listFileBookingsForCars([carId], from, to);
    for (const row of fileRows) {
      if (row.status !== "PENDING" && row.status !== "CONFIRMED") continue;
      const uid = `booking-${row.id}@rentairportcars.com`;
      if (events.some((event) => event.uid === uid)) continue;
      events.push({
        uid,
        summary: `RentAirportCars ${formatBookingRef(row.sequentialNumber) || row.id}`,
        start: row.pickupAt,
        end: row.bufferEndsAt || computeBufferEndsAt(new Date(row.dropoffAt)).toISOString(),
      });
    }
  } catch {
    /* file store optional */
  }

  const blocks = await listCalendarBlocksForCars([carId], from, to).catch(() => []);
  for (const block of blocks) {
    events.push({
      uid: `block-${block.id}@rentairportcars.com`,
      summary: block.label || "Blocked",
      start: block.from,
      end: computeBufferEndsAt(new Date(block.to)).toISOString(),
    });
  }

  return buildIcalCalendar({ name: carLabel || "RentAirportCars", events });
}
