import { BOOKING_BUFFER_HOURS } from "@/lib/brand";

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function computeBufferEndsAt(dropoffAt: Date) {
  return addHours(dropoffAt, BOOKING_BUFFER_HOURS);
}

/**
 * A confirmed booking occupies [pickupAt, bufferEndsAt).
 * The +12h window is appended after drop-off so the car can be prepared.
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart < bEnd && bStart < aEnd;
}
