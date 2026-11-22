/**
 * Online checkout (BOG / PayPal) must stay invisible until the gateway
 * actually charges or holds funds (`paymentStatus === "PAID"`).
 *
 * Bookings without an online provider (0€ site fee / pay-later) stay visible.
 */

export type PaymentVisibilityFields = {
  paymentProvider?: string | null;
  paymentStatus?: string | null;
};

export function isOnlinePaymentProvider(provider: string | null | undefined): boolean {
  const p = String(provider || "").trim().toLowerCase();
  return p === "bog" || p === "paypal";
}

/** True while bog/paypal checkout exists but money is not yet charged/held. */
export function isOnlineCheckoutAwaitingPayment(b: PaymentVisibilityFields): boolean {
  if (!isOnlinePaymentProvider(b.paymentProvider)) return false;
  return String(b.paymentStatus || "").trim().toUpperCase() !== "PAID";
}

/** Lists, calendars, availability, lookup — hide until paid. */
export function isBookingVisibleBeforePaymentGate(b: PaymentVisibilityFields): boolean {
  return !isOnlineCheckoutAwaitingPayment(b);
}

/**
 * Prisma `where` fragment: exclude bog/paypal rows that are not PAID.
 * Safe to AND / spread with status / date filters.
 */
export function prismaExcludeUnpaidOnlineCheckout(): {
  NOT: {
    AND: Array<
      | { paymentProvider: { in: string[] } }
      | { paymentStatus: { not: string } }
    >;
  };
} {
  return {
    NOT: {
      AND: [
        { paymentProvider: { in: ["bog", "paypal"] } },
        { paymentStatus: { not: "PAID" } },
      ],
    },
  };
}
