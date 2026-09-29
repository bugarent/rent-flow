/** Invoice / credit-note document types (client-safe). */

import type { RefundChangeDetail } from "@/lib/bookings/refund-change-details";

export type InvoiceIssuer = {
  legalName: string;
  tradingName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  bankName: string;
  iban: string;
  bic: string;
  logoUrl: string;
  website: string;
};

export type InvoiceLineItem = {
  sku?: string;
  description: string;
  quantity: number;
  unitPriceEur: number;
  totalEur: number;
};

export type InvoicePaymentLine = {
  label: string;
  method: string;
  amountEur: number;
  at?: string;
};

export type InvoiceCreditNote = {
  id: string;
  number: string;
  status: "PENDING" | "REFUNDED" | "CANCELLED";
  amountEur: number;
  depositPercent: number;
  paymentSource: string;
  createdAt: string;
  refundedAt?: string;
  reason: string;
  changes: RefundChangeDetail[];
};

export type BookingInvoiceDocument = {
  documentType: "invoice";
  invoiceNumber: string;
  issuedAt: string;
  currency: "EUR";
  bookingId: string;
  bookingRef: string;
  status: string;
  issuer: InvoiceIssuer;
  /** Recipient box: platform name plus the partner registration code. */
  recipientName: string;
  recipientCode: string;
  billTo: {
    name: string;
    email: string;
    phone: string;
  };
  service: {
    title: string;
    pickupAt: string;
    dropoffAt: string;
    pickupPlace: string;
    dropoffPlace: string;
    days: number;
  };
  lines: InvoiceLineItem[];
  subtotalEur: number;
  totalEur: number;
  depositPercent: number;
  /** Site percent of the trip. depositPaidEur is this amount; the card fee is separate. */
  siteFeeEur: number;
  cardSurchargeEur: number;
  cardSurchargePercent: number;
  /** Site fee plus card surcharge. */
  onlineDueEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  payments: InvoicePaymentLine[];
  creditNotes: InvoiceCreditNote[];
  /** Sum of pending + completed credit-note amounts owed / returned to client. */
  creditNotesTotalEur: number;
  pendingCreditEur: number;
  refundedCreditEur: number;
};
