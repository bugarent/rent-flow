/** Admin/partner bookings list section filters. */

export type BookingListSectionId = "all" | "active" | "cancelled" | "incomplete";

type BookingLike = {
  status: string;
  pickupAt: string;
  dropoffAt: string;
};

function dropoffMs(b: BookingLike) {
  const t = new Date(b.dropoffAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** CONFIRMED and rental not yet finished (upcoming or in progress). */
export function isActiveOrOngoingBooking(b: BookingLike, nowMs = Date.now()) {
  return b.status === "CONFIRMED" && dropoffMs(b) >= nowMs;
}

/** Admin-marked: partner did not fulfill the booking. */
export function isUnfulfilledBooking(b: BookingLike) {
  return b.status === "UNFULFILLED";
}

export function bookingMatchesSection(
  b: BookingLike,
  section: BookingListSectionId,
  nowMs = Date.now(),
) {
  switch (section) {
    case "all":
      // Working list: pending / confirmed / completed (not cancelled or unfulfilled)
      return b.status === "PENDING" || b.status === "CONFIRMED" || b.status === "COMPLETED";
    case "active":
      return isActiveOrOngoingBooking(b, nowMs);
    case "cancelled":
      // Cancelled by customer or admin
      return b.status === "CANCELLED";
    case "incomplete":
      return isUnfulfilledBooking(b);
    default:
      return true;
  }
}

export function countBookingsBySection<T extends BookingLike>(bookings: T[], nowMs = Date.now()) {
  const counts = { all: 0, active: 0, cancelled: 0, incomplete: 0 };
  for (const b of bookings) {
    if (bookingMatchesSection(b, "all", nowMs)) counts.all += 1;
    if (bookingMatchesSection(b, "active", nowMs)) counts.active += 1;
    if (bookingMatchesSection(b, "cancelled", nowMs)) counts.cancelled += 1;
    if (bookingMatchesSection(b, "incomplete", nowMs)) counts.incomplete += 1;
  }
  return counts;
}
