/** Status filters for the shared bookings table UI. */

export type BookingsTableStatusFilter =
  | "all"
  | "paid"
  | "cancelled"
  | "empty";

type BookingLike = { status: string };

/** Confirmed / completed / pending (deposit paid) → active bookings. */
export function isActiveBookingStatus(status: string) {
  return status === "PENDING" || status === "CONFIRMED" || status === "COMPLETED";
}

/** Rental return time has passed. */
export function rentalHasEnded(dropoffAt: string, now = Date.now()) {
  const end = new Date(dropoffAt).getTime();
  return Number.isFinite(end) && end <= now;
}

export function bookingMatchesStatusFilter(
  b: BookingLike,
  filter: BookingsTableStatusFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "paid":
      return isActiveBookingStatus(b.status);
    case "cancelled":
      return b.status === "CANCELLED";
    case "empty":
      return b.status === "UNFULFILLED";
    default:
      return true;
  }
}

export function countBookingsByStatusFilter<T extends BookingLike>(bookings: T[]) {
  const counts: Record<BookingsTableStatusFilter, number> = {
    all: bookings.length,
    paid: 0,
    cancelled: 0,
    empty: 0,
  };
  for (const b of bookings) {
    if (bookingMatchesStatusFilter(b, "paid")) counts.paid += 1;
    if (bookingMatchesStatusFilter(b, "cancelled")) counts.cancelled += 1;
    if (bookingMatchesStatusFilter(b, "empty")) counts.empty += 1;
  }
  return counts;
}

export function bookingsTableStatusTone(
  status: string,
): "paid" | "cancelled" | "empty" | "neutral" {
  if (isActiveBookingStatus(status)) return "paid";
  if (status === "CANCELLED") return "cancelled";
  if (status === "UNFULFILLED") return "empty";
  return "neutral";
}
