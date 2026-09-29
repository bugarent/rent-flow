import type { RefundChangeDetail } from "@/lib/bookings/refund-change-details";

export type BookingInfoExtra = { id: string; label: string; priceEur: number; qty?: number };

export type BookingInfoLocationOption = {
  iata: string;
  label: string;
  priceEur?: number;
  freeAfterDays?: number | null;
};

export type BookingInfoData = {
  id: string;
  sequentialNumber?: number;
  reference?: string | null;
  status: string;
  /** Guest comment collected when they cancel. */
  cancellationReason?: string;
  pickupAt: string;
  dropoffAt: string;
  flightNumber?: string;
  totalPriceEur: number;
  depositPercent?: number;
  depositPaidEur?: number;
  balanceDueEur?: number;
  /** Business-partner promo code when −5% was applied at checkout. */
  promoCode?: string;
  /** Confirmed business-partner code shown to admin. */
  businessPartnerCode?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  dateOfBirth?: string;
  countryOfResidence?: string;
  guestMessenger?: string;
  guestMessengers?: string[];
  extras?: BookingInfoExtra[];
  carId?: string;
  car: {
    make: string;
    model: string;
    year?: number;
    imageUrl?: string | null;
    fuelType?: string;
    transmission?: string;
    seats?: number | null;
    doors?: number | null;
    dailyRateEur?: number;
    engineVolume?: string;
    categoryLabel?: string;
    registrationNumber?: string;
  };
  delivery?: {
    pickupLabel: string;
    dropoffLabel: string;
    pickupShort: string;
    dropoffShort: string;
    pickupFeeEur: number;
    dropoffFeeEur: number;
    totalFeeEur: number;
  };
  partner?: {
    companyName?: string;
    partnerCode?: string | null;
    sequentialNumber?: number | null;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
    messengers?: string[];
    primaryMessengers?: string[];
    secondaryMessengers?: string[];
    clientLanguages?: string[];
    logoUrl?: string | null;
  };
  pickupAirport?: { iata: string; city: string; name: string; timezone?: string };
  dropoffAirport?: { iata: string; city: string; name: string; timezone?: string };
  pickupAddress?: string;
  dropoffAddress?: string;
  locationOptions?: BookingInfoLocationOption[];
  pendingChanges?: {
    pickupAt?: string;
    dropoffAt?: string;
    pickupAirportIata?: string;
    dropoffAirportIata?: string;
    extras?: BookingInfoExtra[];
    extrasPayNowEur?: number;
  } | null;
  /** Pending site-fee refund invoices — admin-only banner. */
  adminRefundAlerts?: Array<{
    id: string;
    amountEur: number;
    reason: string;
    depositPercent: number;
    createdAt: string;
    changes?: RefundChangeDetail[];
  }>;
};

export type BookingInfoRole = "admin" | "partner" | "guest";

export type CatalogExtra = {
  id: string;
  label: string;
  priceEurPerDay: number;
  /** Admin mandatory free / TPL — cannot be unchecked or removed. */
  locked?: boolean;
  /** Cap for the whole rental. Empty = daily × days. */
  maxPeriodEur?: number | null;
  /** Floor for the whole rental. Empty = no minimum. */
  minPeriodEur?: number | null;
};

export type Copy = {
  back: string;
  cancelBooking: string;
  cancelReasonTitle: string;
  cancelReasonAdmin: string;
  cancelReasonPlaceholder: string;
  cancelReasonRequired: string;
  cancelFeeKept: string;
  cancelFeeKeptTitle: string;
  cancelRefundableHint: string;
  cancelHoursLeft: string;
  /** Shown when pickup is under 48h and the site fee will not be refunded. */
  cancelUnder48NoProtection: string;
  /** Protection active but pickup is under 2 hours — commission kept. */
  cancelUnder2WithProtection: string;
  cancelSubmit: string;
  paid: string;
  completed: string;
  pending: string;
  cancelled: string;
  partnerCancelled: string;
  totalPrice: string;
  priceForDays: string;
  perDay: string;
  toPay: string;
  amountPaid: string;
  payAtPickup: string;
  driver: string;
  partner: string;
  partnerCode: string;
  company: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  name: string;
  lastName: string;
  flight: string;
  birthDate: string;
  age: string;
  residenceCountry: string;
  messenger: string;
  languages: string;
  period: string;
  car: string;
  options: string;
  noOptions: string;
  pickup: string;
  dropoff: string;
  editDates: string;
  location: string;
  daysCount: string;
  save: string;
  cancel: string;
  deleteBooking: string;
  deleteConfirm: string;
  selectedOptions: string;
  availableOptions: string;
  addServices: string;
  deliveryInfo: string;
  deliveryPickupTitle: string;
  deliveryReturnTitle: string;
  dailyTimesDays: string;
  carRental: string;
  dueWasAtPickup: string;
  addingServicesValue: string;
  payingNow: string;
  dueWillAtPickup: string;
  savePayment: string;
  refundable: string;
  refundableHint: string;
  mandatory: string;
  mandatoryLocked: string;
  confirmChanges: string;
  pendingBanner: string;
  refundAlertTitle: string;
  refundAlertAmount: string;
  refundAlertHint: string;
  refundReasonExtras: string;
  refundReasonDays: string;
  refundReasonGeneric: string;
  viewOnly: string;
  daysPriceChange: string;
  daysWasNow: string;
  rentalWasNow: string;
  deliveryWasNow: string;
  updatedTotal: string;
  daysUnchanged: string;
  time: string;
  fullTotal: string;
  partnerGrandTotal: string;
  partnerPaid: string;
  partnerDueAtPickup: string;
};

export type LiveDelivery = {
  pickupIata: string;
  dropoffIata: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupFeeEur: number;
  dropoffFeeEur: number;
  totalFeeEur: number;
};

export type ExtrasPaymentBreakdown = {
  originalDays: number;
  newDays: number;
  dayDelta: number;
  daysChanged: boolean;
  locationsChanged: boolean;
  originalRental: number;
  projectedRental: number;
  rentalDelta: number;
  originalDelivery: number;
  projectedDelivery: number;
  deliveryDelta: number;
  tripChanged: boolean;
  projectedExtras: number;
  originalComponents: number;
  projectedComponents: number;
  addedServicesTotal: number;
  payNow: number;
  dueWas: number;
  dueWill: number;
  projectedTotal: number;
  persistTotalEur: number;
  liveBalanceDue: number;
  nextDepositPaidEur: number;
  nextBalanceDueEur: number;
  depositPercent: number;
  siteFeeEur: number;
  cardSurchargeEur: number;
  refundableSiteFeeEur: number;
  totalDelta: number;
};
