/** Guest booking details stay available for one year, then are removed. */
export const BOOKING_RETENTION_MONTHS = 12;

export function bookingRetentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setMonth(cutoff.getMonth() - BOOKING_RETENTION_MONTHS);
  return cutoff;
}

export function isWithinBookingRetention(createdAt: string | Date, now = new Date()): boolean {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const createdMs = created.getTime();
  if (!Number.isFinite(createdMs)) return false;
  return createdMs >= bookingRetentionCutoff(now).getTime();
}
