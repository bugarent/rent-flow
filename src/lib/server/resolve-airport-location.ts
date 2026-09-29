import "server-only";

import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import {
  DEFAULT_AIRPORT_TIMEZONE,
  normalizeIanaTimeZone,
} from "@/lib/datetime/airport-timezone";
import {
  DEFAULT_OPERATING_HOURS,
  normalizeOperatingHours,
  type AirportOperatingHours,
} from "@/lib/locations/operating-hours";

export type ResolvedAirportLocation = {
  iata: string;
  timezone: string;
  hours: AirportOperatingHours;
  source: "db" | "catalog" | "default";
};

function catalogTimezone(iata: string): string | null {
  const row = CATALOG_AIRPORTS.find((a) => a.iata === iata.toUpperCase());
  return row?.timezone ? normalizeIanaTimeZone(row.timezone) : null;
}

/**
 * Resolve IANA timezone (+ operating hours) for an airport IATA.
 * Prefers DB Airport row when available; falls back to static catalog.
 */
export async function resolveAirportLocation(
  iataRaw: string,
): Promise<ResolvedAirportLocation> {
  const iata = String(iataRaw || "").trim().toUpperCase();
  if (!iata) {
    return {
      iata: "",
      timezone: DEFAULT_AIRPORT_TIMEZONE,
      hours: DEFAULT_OPERATING_HOURS,
      source: "default",
    };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.airport.findUnique({
      where: { iata },
      select: {
        iata: true,
        timezone: true,
        operatingOpenLocal: true,
        operatingCloseLocal: true,
        overnightAllowed: true,
      },
    });
    if (row) {
      return {
        iata: row.iata,
        timezone: normalizeIanaTimeZone(row.timezone),
        hours: normalizeOperatingHours({
          openLocal: row.operatingOpenLocal,
          closeLocal: row.operatingCloseLocal,
          overnightAllowed: row.overnightAllowed,
        }),
        source: "db",
      };
    }
  } catch {
    /* DB offline / migration pending — catalog fallback */
  }

  const tz = catalogTimezone(iata);
  return {
    iata,
    timezone: tz || DEFAULT_AIRPORT_TIMEZONE,
    hours: DEFAULT_OPERATING_HOURS,
    source: tz ? "catalog" : "default",
  };
}

export async function resolveAirportTimezone(iata: string): Promise<string> {
  return (await resolveAirportLocation(iata)).timezone;
}
