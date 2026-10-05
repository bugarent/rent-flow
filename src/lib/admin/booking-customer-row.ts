export type BookingCustomerBooking = {
  id: string;
  code: string;
  pickupAt: string;
  dropoffAt: string;
  status: string;
};

/** One person who has made at least one booking (account or guest checkout). */
export type BookingCustomerRow = {
  id: string;
  userId: string | null;
  customerNumber: number | null;
  displayName: string;
  email: string;
  phone: string;
  countryLabel: string;
  messengers: string[];
  /** ACTIVE, SUSPENDED, or another user status. Guests with no account are ACTIVE until blocked. */
  status: string;
  banned: boolean;
  /** True when the row is tied to a customer account. */
  hasAccount: boolean;
  bookingCount: number;
  bookings: BookingCustomerBooking[];
};
