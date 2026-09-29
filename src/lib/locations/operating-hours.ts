/**
 * Pickup / return operating-hours checks in the airport's local timezone.
 * Hours are HH:mm wall-clock strings stored on Airport (defaults 00:00–23:59).
 */

import { getZonedParts, normalizeIanaTimeZone } from "@/lib/datetime/airport-timezone";

export type AirportOperatingHours = {
  /** HH:mm local open (inclusive). */
  openLocal: string;
  /** HH:mm local close (inclusive minute). Use 23:59 for end of day. */
  closeLocal: string;
  /** When true, overnight rentals may span midnight. Hours still apply to each leg. */
  overnightAllowed: boolean;
};

export const DEFAULT_OPERATING_HOURS: AirportOperatingHours = {
  openLocal: "00:00",
  closeLocal: "23:59",
  overnightAllowed: true,
};

function parseHm(raw: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(raw || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function normalizeOperatingHours(
  raw?: Partial<AirportOperatingHours> | null,
): AirportOperatingHours {
  const openLocal =
    parseHm(raw?.openLocal || "") != null
      ? String(raw!.openLocal).trim()
      : DEFAULT_OPERATING_HOURS.openLocal;
  const closeLocal =
    parseHm(raw?.closeLocal || "") != null
      ? String(raw!.closeLocal).trim()
      : DEFAULT_OPERATING_HOURS.closeLocal;
  return {
    openLocal,
    closeLocal,
    overnightAllowed: raw?.overnightAllowed !== false,
  };
}

/** Whether a UTC Instant falls inside local operating hours for `timeZone`. */
export function isWithinOperatingHours(
  instant: Date | string,
  timeZone: string,
  hours: Partial<AirportOperatingHours> | null | undefined = DEFAULT_OPERATING_HOURS,
): boolean {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) return false;
  const normalized = normalizeOperatingHours(hours);
  const open = parseHm(normalized.openLocal);
  const close = parseHm(normalized.closeLocal);
  if (open == null || close == null) return true;
  const parts = getZonedParts(d, normalizeIanaTimeZone(timeZone));
  const minutes = parts.hour * 60 + parts.minute;
  if (open <= close) {
    return minutes >= open && minutes <= close;
  }
  // Overnight window e.g. 22:00–06:00
  return minutes >= open || minutes <= close;
}

export function assertPickupReturnHours(input: {
  pickupAt: Date;
  dropoffAt: Date;
  pickupTimeZone: string;
  dropoffTimeZone: string;
  pickupHours?: Partial<AirportOperatingHours> | null;
  dropoffHours?: Partial<AirportOperatingHours> | null;
}): { ok: true } | { ok: false; code: "PICKUP_OUTSIDE_HOURS" | "DROPOFF_OUTSIDE_HOURS" } {
  if (!isWithinOperatingHours(input.pickupAt, input.pickupTimeZone, input.pickupHours)) {
    return { ok: false, code: "PICKUP_OUTSIDE_HOURS" };
  }
  if (!isWithinOperatingHours(input.dropoffAt, input.dropoffTimeZone, input.dropoffHours)) {
    return { ok: false, code: "DROPOFF_OUTSIDE_HOURS" };
  }
  return { ok: true };
}
