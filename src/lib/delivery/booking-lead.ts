/** Platform default: bookings must be at least 2 hours before pickup. */
export const DEFAULT_BOOKING_LEAD_MINUTES = 120;

/**
 * Effective lead time for a delivery location.
 * Partner `travelTimeMinutes` > 0 = explicit restriction; otherwise platform default (2h).
 */
export function resolveBookingLeadMinutes(travelTimeMinutes?: number | null): number {
  const partner = Math.max(0, Math.floor(Number(travelTimeMinutes) || 0));
  return partner > 0 ? partner : DEFAULT_BOOKING_LEAD_MINUTES;
}

/** Whole minutes from now until pickup (floored, never negative). */
export function minutesUntilPickup(pickupAt: string | Date, now = Date.now()): number {
  const t = typeof pickupAt === "string" ? new Date(pickupAt).getTime() : pickupAt.getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((t - now) / 60_000));
}

/** True when pickup is far enough ahead for this location's lead time. */
export function meetsBookingLeadTime(
  travelTimeMinutes: number | null | undefined,
  minutesUntil: number,
): boolean {
  return resolveBookingLeadMinutes(travelTimeMinutes) <= minutesUntil;
}

type LeadDeliveryRow = {
  travelTimeMinutes?: number | null;
  deliveryLocation?: {
    isActive?: boolean;
    airport?: { iata?: string; city?: { country?: { iso2?: string } } } | null;
  } | null;
};

/**
 * Whether any matching pickup place on the car allows booking at `pickupAt`.
 * Returns the strictest matching lead when none qualify (for error copy).
 */
export function evaluatePickupLeadTime(input: {
  pickupAt: string | Date;
  pickupCode: string;
  rows: LeadDeliveryRow[];
  cityIso2?: string | null;
  now?: number;
}): { ok: true; minutesUntil: number } | { ok: false; minutesUntil: number; requiredMinutes: number } {
  const minutesUntil = minutesUntilPickup(input.pickupAt, input.now);
  const code = String(input.pickupCode || "").toUpperCase();
  const cityIso2 = input.cityIso2?.toUpperCase() || null;
  const matching = (input.rows || []).filter((row) => {
    const loc = row.deliveryLocation;
    if (!loc?.isActive || !loc.airport) return false;
    if (cityIso2) return loc.airport.city?.country?.iso2?.toUpperCase() === cityIso2;
    return loc.airport.iata?.toUpperCase() === code;
  });

  if (!matching.length) {
    const requiredMinutes = DEFAULT_BOOKING_LEAD_MINUTES;
    return minutesUntil >= requiredMinutes
      ? { ok: true, minutesUntil }
      : { ok: false, minutesUntil, requiredMinutes };
  }

  if (matching.some((row) => meetsBookingLeadTime(row.travelTimeMinutes, minutesUntil))) {
    return { ok: true, minutesUntil };
  }

  const requiredMinutes = Math.min(
    ...matching.map((row) => resolveBookingLeadMinutes(row.travelTimeMinutes)),
  );
  return { ok: false, minutesUntil, requiredMinutes };
}
