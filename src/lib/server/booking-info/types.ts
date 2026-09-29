import type { FileBookingRecord } from "@/lib/server/customer-bookings-store";

export type BookingInfoLocationOption = {
  iata: string;
  label: string;
  /** Partner one-way delivery fee for this place (before free-after-days). */
  priceEur: number;
  freeAfterDays: number | null;
};

export type BookingInfoPartnerPayload = {
  companyName: string;
  partnerCode: string | null;
  sequentialNumber: number | null;
  email: string;
  phone: string;
  secondaryPhone: string;
  messengers: string[];
  primaryMessengers: string[];
  secondaryMessengers: string[];
  clientLanguages: string[];
  logoUrl: string | null;
};

export type BookingInfoDetailPayload = {
  id: string;
  sequentialNumber: number;
  reference: string | null;
  status: string;
  cancellationReason?: string;
  pickupAt: string;
  dropoffAt: string;
  flightNumber: string;
  totalPriceEur: number;
  depositPercent: number;
  depositPaidEur: number;
  balanceDueEur: number;
  /** Business-partner promo / referral code when the booking used −5%. */
  promoCode?: string;
  /** Confirmed business-partner code (link, QR, or typed) for admin display. */
  businessPartnerCode?: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  dateOfBirth: string;
  countryOfResidence: string;
  guestMessenger: string;
  guestMessengers: string[];
  extras: Array<{ id: string; label: string; priceEur: number; qty?: number }>;
  carId: string;
  car: {
    make: string;
    model: string;
    year: number;
    imageUrl: string | null;
    fuelType: string;
    transmission: string;
    seats: number | null;
    doors: number | null;
    dailyRateEur: number;
    engineVolume: string;
    /** Administrator category, or the body type entered on the car. */
    categoryLabel?: string;
    registrationNumber?: string;
  };
  partner: BookingInfoPartnerPayload;
  pickupAirport: { iata: string; city: string; name: string; timezone?: string };
  dropoffAirport: { iata: string; city: string; name: string; timezone?: string };
  pickupAddress: string;
  dropoffAddress: string;
  /** Places the car can be picked up / returned (for edit UI). */
  locationOptions: BookingInfoLocationOption[];
  pendingChanges: FileBookingRecord["pendingChanges"];
  fileStored: boolean;
  catalogExtras: Array<{
    id: string;
    label: string;
    priceEurPerDay: number;
    locked?: boolean;
    maxPeriodEur?: number | null;
  }>;
  /** Pending site-fee refund invoices (admin-only UI). */
  adminRefundAlerts?: Array<{
    id: string;
    amountEur: number;
    reason: string;
    depositPercent: number;
    createdAt: string;
    changes?: import("@/lib/bookings/refund-change-details").RefundChangeDetail[];
  }>;
  delivery: {
    pickupLabel: string;
    dropoffLabel: string;
    pickupShort: string;
    dropoffShort: string;
    pickupFeeEur: number;
    dropoffFeeEur: number;
    totalFeeEur: number;
  };
};
