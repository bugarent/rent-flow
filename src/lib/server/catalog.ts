import { defaultEurUsdRate, defaultFxRates, getFxRates } from "@/lib/server/preferences";
import type { FxRates } from "@/lib/fx";

/** @deprecated Prefer getFxRates() — kept for older call sites. */
export async function getEurUsdRate() {
  try {
    const rates = await getFxRates();
    return rates.eurUsd;
  } catch {
    return defaultEurUsdRate();
  }
}

export async function getSearchAirports() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { CATALOG_AIRPORTS } = await import("@/lib/catalog/airports");
    const approved = await prisma.airport.findMany({
      where: {
        isActive: true,
        OR: [{ isHub: true }, { partners: { some: { partner: { status: "APPROVED" } } } }],
      },
      include: { city: { include: { country: true } } },
      orderBy: [{ isHub: "desc" }, { sortOrder: "asc" }],
    });
    if (approved.length === 0) return CATALOG_AIRPORTS;
    return approved.map((a) => {
      const fallback = CATALOG_AIRPORTS.find((c) => c.iata === a.iata);
      return (
        fallback ?? {
          iata: a.iata,
          citySlug: a.city.slug,
          countryIso2: a.city.country.iso2,
          isHub: a.isHub,
          timezone: a.timezone,
          name: a.name as (typeof CATALOG_AIRPORTS)[number]["name"],
          cityName: a.city.name as (typeof CATALOG_AIRPORTS)[number]["cityName"],
          countryName: a.city.country.name as (typeof CATALOG_AIRPORTS)[number]["countryName"],
        }
      );
    });
  } catch {
    const { CATALOG_AIRPORTS } = await import("@/lib/catalog/airports");
    return CATALOG_AIRPORTS.filter((a) => a.isHub);
  }
}

export type { FxRates };
export { defaultFxRates, getFxRates };
