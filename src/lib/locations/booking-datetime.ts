/**
 * Frontend helpers: display / edit booking times in the selected airport's IANA zone.
 * Stored amounts stay EUR; use convertFromEur / formatMoney for currency display.
 */

export {
  airportLocalToUtc,
  formatAirportLocalDateTime,
  normalizeIanaTimeZone,
  parseBookingInstant,
  parseClientBookingInstant,
  utcToAirportLocalInput,
  DEFAULT_AIRPORT_TIMEZONE,
} from "@/lib/datetime/airport-timezone";

export {
  assertPickupReturnHours,
  isWithinOperatingHours,
  normalizeOperatingHours,
  DEFAULT_OPERATING_HOURS,
  type AirportOperatingHours,
} from "@/lib/locations/operating-hours";

/** Catalog/static timezone lookup (no DB) for client components. */
export function catalogTimezoneForIata(
  iata: string,
  catalog: Array<{ iata: string; timezone: string }>,
): string {
  const code = String(iata || "").trim().toUpperCase();
  const row = catalog.find((a) => a.iata.toUpperCase() === code);
  return row?.timezone?.trim() || "Asia/Tbilisi";
}
