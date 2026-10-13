import "server-only";

import { prisma } from "@/lib/prisma";
import { CATALOG_AIRPORTS, type CatalogAirport } from "@/lib/catalog/airports";
import { findSearchPlace, placeSlug } from "@/lib/catalog/search-places";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { primaryTimezoneForCountry } from "@/lib/catalog/country-timezones";

/** Catalog data for an airport: the curated list first, then the per-country place seeds. */
function airportSeed(iata: string): CatalogAirport | null {
  const catalog = CATALOG_AIRPORTS.find((a) => a.iata === iata);
  if (catalog) return catalog;
  const place = findSearchPlace(iata);
  if (place?.kind !== "airport" || !place.countryIso2) return null;
  const iso2 = place.countryIso2.toUpperCase();
  return {
    iata,
    citySlug: placeSlug(place.cityName),
    countryIso2: iso2,
    name: { en: place.name },
    cityName: { en: place.cityName },
    countryName: { en: worldCountryName(iso2) },
    isHub: false,
    timezone: primaryTimezoneForCountry(iso2),
  };
}

/** Ensure catalog airports exist in Postgres so PartnerAirport FKs resolve. */
export async function ensureAirportsByIata(iatas: string[]): Promise<Array<{ id: string; iata: string }>> {
  const wanted = [...new Set(iatas.map((i) => i.toUpperCase()).filter(Boolean))];
  if (!wanted.length) return [];

  const existing = await prisma.airport.findMany({
    where: { iata: { in: wanted } },
    select: { id: true, iata: true },
  });
  const have = new Set(existing.map((a) => a.iata));
  const missing = wanted.filter((i) => !have.has(i));

  for (const iata of missing) {
    const catalog = airportSeed(iata);
    if (!catalog) continue;
    // Seed names are English-only: never let them replace translated names already saved.
    const curated = CATALOG_AIRPORTS.some((a) => a.iata === iata);

    const country = await prisma.country.upsert({
      where: { iso2: catalog.countryIso2 },
      create: {
        iso2: catalog.countryIso2,
        name: catalog.countryName,
        sortOrder: catalog.isHub ? 0 : 50,
      },
      update: curated ? { name: catalog.countryName } : {},
    });

    const city = await prisma.city.upsert({
      where: { countryId_slug: { countryId: country.id, slug: catalog.citySlug } },
      create: {
        countryId: country.id,
        slug: catalog.citySlug,
        name: catalog.cityName,
      },
      update: curated ? { name: catalog.cityName } : {},
    });

    const airport = await prisma.airport.upsert({
      where: { iata },
      create: {
        iata,
        icao: catalog.icao,
        cityId: city.id,
        name: catalog.name,
        latitude: catalog.latitude,
        longitude: catalog.longitude,
        timezone: catalog.timezone,
        isHub: catalog.isHub,
        isActive: true,
      },
      update: {
        name: catalog.name,
        isHub: catalog.isHub,
        isActive: true,
      },
      select: { id: true, iata: true },
    });
    existing.push(airport);
  }

  return existing.filter((a) => wanted.includes(a.iata));
}

export async function setPartnerAirports(partnerId: string, iatas: string[]) {
  const airports = await ensureAirportsByIata(iatas);
  await prisma.partnerAirport.deleteMany({ where: { partnerId } });
  if (airports.length) {
    await prisma.partnerAirport.createMany({
      data: airports.map((a) => ({ partnerId, airportId: a.id })),
      skipDuplicates: true,
    });
  }
  return airports;
}

export async function getPartnerOperatingAirports(partnerId: string) {
  const rows = await prisma.partnerAirport.findMany({
    where: { partnerId },
    include: {
      airport: { include: { city: { include: { country: true } } } },
    },
    orderBy: { airport: { iata: "asc" } },
  });
  return rows.map((r) => {
    const countryName =
      r.airport.city.country.name &&
      typeof r.airport.city.country.name === "object" &&
      "en" in (r.airport.city.country.name as object)
        ? String((r.airport.city.country.name as { en?: string }).en ?? r.airport.city.country.iso2)
        : r.airport.city.country.iso2;
    const cityName =
      r.airport.city.name &&
      typeof r.airport.city.name === "object" &&
      "en" in (r.airport.city.name as object)
        ? String((r.airport.city.name as { en?: string }).en ?? r.airport.iata)
        : r.airport.iata;
    return {
      airportId: r.airportId,
      iata: r.airport.iata,
      label: `${cityName} (${r.airport.iata})`,
      country: countryName,
      countryIso2: r.airport.city.country.iso2,
    };
  });
}
