import "server-only";

import { isActiveBookingStatus } from "@/lib/bookings/table-filters";
import { listHomepageCategories } from "@/lib/server/homepage-categories-store";
import { loadAdminBookingFacts, type AdminBookingFact } from "@/lib/server/admin-booking-facts";

export type AdminBookingStatistics = {
  totalActive: number;
  categoryStats: Array<{ id: string; name: string; details: string; bookings: number }>;
  modelStats: Array<{ model: string; bookings: number }>;
  airportStats: Array<{ title: string; iata: string; bookings: number }>;
};

function inRange(iso: string, start: Date, end: Date) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime();
}

/** A booking counts when it was created in the range, or its pick-up falls in the range. */
export function factInStatisticsRange(fact: AdminBookingFact, start: Date, end: Date) {
  if (!isActiveBookingStatus(fact.status)) return false;
  return inRange(fact.createdAt, start, end) || inRange(fact.pickupAt, start, end);
}

function categorySlugForFact(
  fact: AdminBookingFact,
  categories: Array<{ slug: string; name: string }>,
) {
  const raw = (fact.categorySlug || "").trim().toLowerCase();
  if (!raw) return null;
  const hit = categories.find(
    (category) =>
      category.slug.trim().toLowerCase() === raw || category.name.trim().toLowerCase() === raw,
  );
  return hit?.slug ?? null;
}

export async function buildAdminBookingStatistics(from: string, to: string): Promise<AdminBookingStatistics> {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const facts = (await loadAdminBookingFacts()).filter((fact) => factInStatisticsRange(fact, start, end));
  const categories = (await listHomepageCategories())
    .filter((category) => category.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const categoryStats = categories.map((category) => ({
    id: category.id,
    name: category.name,
    details: category.details,
    bookings: facts.filter((fact) => categorySlugForFact(fact, categories) === category.slug).length,
  }));

  const modelMap = new Map<string, number>();
  for (const fact of facts) {
    const key = fact.carLabel || `${fact.carMake} ${fact.carModel}`.trim() || "—";
    modelMap.set(key, (modelMap.get(key) ?? 0) + 1);
  }

  const airportMap = new Map<string, { title: string; iata: string; bookings: number }>();
  for (const fact of facts) {
    const iata = fact.pickupIata || "—";
    const current = airportMap.get(iata) ?? {
      title: fact.pickupTitle || iata,
      iata,
      bookings: 0,
    };
    current.bookings += 1;
    airportMap.set(iata, current);
  }

  return {
    totalActive: facts.length,
    categoryStats,
    modelStats: [...modelMap.entries()]
      .map(([model, bookings]) => ({ model, bookings }))
      .sort((a, b) => b.bookings - a.bookings),
    airportStats: [...airportMap.values()].sort((a, b) => b.bookings - a.bookings),
  };
}
