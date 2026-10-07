/** Guest booking details stay searchable for 30 days after the rental starts. */
export const BOOKING_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bookings whose start is older than this instant are past retention.
 * A trip booked weeks ahead stays searchable until 30 days after its start.
 */
export function bookingRetentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - BOOKING_RETENTION_DAYS * DAY_MS);
}

/** True until 30 days after `startAt` (the rental start). Missing dates are not kept. */
export function isWithinBookingRetention(
  startAt: string | Date | null | undefined,
  now = new Date(),
): boolean {
  if (startAt == null || startAt === "") return false;
  const start = startAt instanceof Date ? startAt : new Date(startAt);
  const startMs = start.getTime();
  if (!Number.isFinite(startMs)) return false;
  return startMs >= bookingRetentionCutoff(now).getTime();
}
