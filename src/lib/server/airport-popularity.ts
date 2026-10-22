import "server-only";

import { createTtlCache } from "@/lib/server/ttl-cache";

const cache = createTtlCache<ReadonlyMap<string, number>>(10 * 60_000);

/** Bookings per pickup airport IATA (cancelled ones excluded), for ranking homepage airport cards. */
export async function bookingCountsByPickupIata(): Promise<ReadonlyMap<string, number>> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.booking.groupBy({
      by: ["pickupAirportId"],
      where: { status: { not: "CANCELLED" } },
      _count: { _all: true },
    });
    const airports = await prisma.airport.findMany({
      where: { id: { in: rows.map((row) => row.pickupAirportId) } },
      select: { id: true, iata: true },
    });
    const iataById = new Map(airports.map((a) => [a.id, a.iata.toUpperCase()]));
    const counts = new Map<string, number>();
    for (const row of rows) {
      const iata = iataById.get(row.pickupAirportId);
      if (iata) counts.set(iata, (counts.get(iata) ?? 0) + row._count._all);
    }
    cache.set(counts);
    return counts;
  } catch (error) {
    console.warn("[airport-popularity] using last known counts", error);
    return cache.peek() ?? new Map();
  }
}
