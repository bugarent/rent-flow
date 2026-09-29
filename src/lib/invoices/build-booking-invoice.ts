import { formatBookingRef, formatPartnerCode } from "@/lib/ids";
import { pickServiceLabel } from "@/lib/extras/service-label";
import { DEFAULT_DEPOSIT_PERCENT, roundMoney } from "@/lib/cars/reserve-pricing";
import { settleBookingMoney } from "@/lib/bookings/booking-money";
import {
  expandRefundChangesFromTrip,
  rentalDayCount,
  type RefundChangeDetail,
} from "@/lib/bookings/refund-change-details";
import type {
  BookingInvoiceDocument,
  InvoiceCreditNote,
  InvoiceIssuer,
  InvoiceLineItem,
} from "@/lib/invoices/types";

export type InvoiceBookingInput = {
  id: string;
  sequentialNumber?: number;
  reference?: string | null;
  status: string;
  pickupAt: string;
  dropoffAt: string;
  totalPriceEur: number;
  depositPercent?: number;
  depositPaidEur?: number;
  balanceDueEur?: number;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  extras?: Array<{ id: string; label: string; priceEur: number; qty?: number }>;
  car: {
    make: string;
    model: string;
    year?: number;
    dailyRateEur?: number;
  };
  delivery?: {
    pickupLabel?: string;
    dropoffLabel?: string;
    pickupFeeEur?: number;
    dropoffFeeEur?: number;
    totalFeeEur?: number;
  };
  pickupAirport?: { iata?: string; city?: string; name?: string };
  dropoffAirport?: { iata?: string; city?: string; name?: string };
  pickupAddress?: string;
  dropoffAddress?: string;
  partner?: {
    partnerCode?: string | null;
    sequentialNumber?: number | null;
  };
};

export type InvoiceRefundInput = {
  id: string;
  amountEur: number;
  depositPercent: number;
  reason: string;
  paymentSource: string;
  status: "PENDING" | "REFUNDED" | "CANCELLED";
  createdAt: string;
  refundedAt?: string;
  changes?: RefundChangeDetail[];
};

function placeLabel(opts: {
  address?: string;
  name?: string;
  city?: string;
  iata?: string;
  fallback?: string;
}): string {
  const address = String(opts.address || "").trim();
  if (address) return address;
  const name = String(opts.name || "").trim();
  const city = String(opts.city || "").trim();
  const iata = String(opts.iata || "").trim().toUpperCase();
  if (name && name.toUpperCase() !== iata) return name;
  if (city) return iata ? `${city} (${iata})` : city;
  return iata || opts.fallback || "—";
}

export function buildBookingInvoiceDocument(input: {
  booking: InvoiceBookingInput;
  issuer: InvoiceIssuer;
  refunds?: InvoiceRefundInput[];
  locale?: string;
}): BookingInvoiceDocument {
  const b = input.booking;
  const days = rentalDayCount(b.pickupAt, b.dropoffAt);
  const daily = roundMoney(Number(b.car.dailyRateEur) || 0);
  const rentalTotal = roundMoney(daily > 0 ? daily * days : 0);
  const deliveryTotal = roundMoney(Number(b.delivery?.totalFeeEur) || 0);
  const extras = Array.isArray(b.extras) ? b.extras : [];

  const locale = input.locale || "ka";
  const L =
    locale === "en"
      ? {
          rental: "Vehicle rental",
          days: (n: number) => `${n} day(s)`,
          delivery: "Airport delivery / collection",
          extra: "Extra service",
          booking: "Car rental booking",
          pickupDelivery: "Pick-up delivery",
          dropoffDelivery: "Return collection",
          deposit: "Site fee",
          card: "Card surcharge",
          depositMethod: "Card / original payment",
          balance: "Balance due at pick-up",
          balanceMethod: "Pay on site",
          rentalLabel: "Car rental",
        }
      : locale === "ru"
        ? {
            rental: "Аренда автомобиля",
            days: (n: number) => `${n} дн.`,
            delivery: "Доставка / забор в аэропорту",
            extra: "Доп. услуга",
            booking: "Бронирование автомобиля",
            pickupDelivery: "Доставка при получении",
            dropoffDelivery: "Забор при возврате",
            deposit: "Комиссия сайта",
            card: "Комиссия карты",
            depositMethod: "Карта / исходный платёж",
            balance: "К оплате при получении",
            balanceMethod: "Оплата на месте",
            rentalLabel: "Аренда авто",
          }
        : {
            rental: "მანქანის ქირა",
            days: (n: number) => `${n} დღე`,
            delivery: "აეროპორტის დელივერი / აღება",
            extra: "დამატებითი სერვისი",
            booking: "მანქანის ჯავშანი",
            pickupDelivery: "აღების დელივერი",
            dropoffDelivery: "დაბრუნების აღება",
            deposit: "საიტის საკომისიო",
            card: "ბარათის საკომისიო",
            depositMethod: "ბარათი / საწყისი გადახდა",
            balance: "ადგილზე გადახდილია",
            balanceMethod: "გადახდა ადგილზე",
            rentalLabel: "მანქანის ქირა",
          };

  const lines: InvoiceLineItem[] = [];
  const carTitle = [b.car.make, b.car.model, b.car.year].filter(Boolean).join(" ").trim();
  if (rentalTotal > 0 || daily > 0) {
    lines.push({
      sku: "RENTAL",
      description: `${carTitle || L.rental} · ${L.days(days)}`,
      quantity: days,
      unitPriceEur: daily,
      totalEur: rentalTotal,
    });
  }
  const pickupFee = roundMoney(Math.max(0, Number(b.delivery?.pickupFeeEur) || 0));
  const dropoffFee = roundMoney(Math.max(0, Number(b.delivery?.dropoffFeeEur) || 0));
  const pickupPlace = String(b.delivery?.pickupLabel || b.pickupAirport?.iata || "").trim();
  const dropoffPlace = String(b.delivery?.dropoffLabel || b.dropoffAirport?.iata || "").trim();
  if (pickupFee + dropoffFee > 0) {
    if (pickupFee > 0) {
      lines.push({
        sku: "DELIVERY-PICKUP",
        description: pickupPlace ? `${L.pickupDelivery} · ${pickupPlace}` : L.pickupDelivery,
        quantity: 1,
        unitPriceEur: pickupFee,
        totalEur: pickupFee,
      });
    }
    if (dropoffFee > 0) {
      lines.push({
        sku: "DELIVERY-DROPOFF",
        description: dropoffPlace ? `${L.dropoffDelivery} · ${dropoffPlace}` : L.dropoffDelivery,
        quantity: 1,
        unitPriceEur: dropoffFee,
        totalEur: dropoffFee,
      });
    }
  } else if (deliveryTotal > 0) {
    lines.push({
      sku: "DELIVERY",
      description: L.delivery,
      quantity: 1,
      unitPriceEur: deliveryTotal,
      totalEur: deliveryTotal,
    });
  }
  let paidExtrasTotal = 0;
  for (const ex of extras) {
    const description = pickServiceLabel(ex.label);
    if (!description) continue;
    const total = roundMoney(Math.max(0, Number(ex.priceEur) || 0));
    const qty = Math.max(1, Number(ex.qty) || 1);
    if (total > 0) paidExtrasTotal = roundMoney(paidExtrasTotal + total);
    lines.push({
      sku: `EXTRA-${ex.id}`.slice(0, 40),
      description,
      quantity: qty,
      unitPriceEur: qty > 0 ? roundMoney(total / qty) : 0,
      totalEur: total,
    });
  }

  if (lines.length === 0) {
    lines.push({
      description: carTitle || L.booking,
      quantity: 1,
      unitPriceEur: 0,
      totalEur: 0,
    });
  }

  const rawPercent = Number(b.depositPercent);
  const depositPercent = Number.isFinite(rawPercent) ? rawPercent : DEFAULT_DEPOSIT_PERCENT;
  const deliveryCharged = pickupFee + dropoffFee > 0 ? roundMoney(pickupFee + dropoffFee) : deliveryTotal;
  const settled = settleBookingMoney({
    rentalEur: rentalTotal,
    extrasEur: paidExtrasTotal,
    deliveryEur: deliveryCharged,
    depositPercent,
  });
  const totalEur = settled.tripEur;
  const depositPaidEur = settled.siteFeeEur;
  const balanceDueEur = settled.onSiteEur;

  const refunds = Array.isArray(input.refunds) ? input.refunds : [];
  const creditNotes: InvoiceCreditNote[] = refunds
    .filter((r) => r.status === "PENDING" || r.status === "REFUNDED")
    .map((r, idx) => {
      const changes = expandRefundChangesFromTrip({
        changes: r.changes,
        depositPercent: r.depositPercent || depositPercent,
        dailyRateEur: daily,
        rentalLabel: L.rentalLabel,
        extras,
      });
      const seq = b.sequentialNumber || 0;
      return {
        id: r.id,
        number: `CN-${seq || "—"}-${String(idx + 1).padStart(2, "0")}`,
        status: r.status,
        amountEur: roundMoney(Number(r.amountEur) || 0),
        depositPercent: r.depositPercent,
        paymentSource: r.paymentSource || "original-payment",
        createdAt: r.createdAt,
        refundedAt: r.refundedAt,
        reason: r.reason,
        changes,
      };
    });

  const pendingCreditEur = roundMoney(
    creditNotes.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amountEur, 0),
  );
  const refundedCreditEur = roundMoney(
    creditNotes.filter((c) => c.status === "REFUNDED").reduce((s, c) => s + c.amountEur, 0),
  );

  const bookingRef =
    b.reference || formatBookingRef(b.sequentialNumber) || b.id.slice(0, 8).toUpperCase();
  const invoiceNumber = `INV-${bookingRef.replace(/^(?:11R-?|RE-?)/i, "")}`;

  return {
    documentType: "invoice",
    invoiceNumber,
    issuedAt: new Date().toISOString(),
    currency: "EUR",
    bookingId: b.id,
    bookingRef,
    status: b.status,
    issuer: input.issuer,
    recipientName: "rentairportcars",
    recipientCode:
      String(b.partner?.partnerCode || "").trim() ||
      formatPartnerCode(b.partner?.sequentialNumber) ||
      "",
    billTo: {
      name: "rentairportcars",
      email: String(b.guestEmail || "").trim(),
      phone: String(b.guestPhone || "").trim(),
    },
    service: {
      title: carTitle || "Airport car rental",
      pickupAt: b.pickupAt,
      dropoffAt: b.dropoffAt,
      pickupPlace: placeLabel({
        address: b.pickupAddress,
        name: b.pickupAirport?.name,
        city: b.pickupAirport?.city,
        iata: b.pickupAirport?.iata,
        fallback: b.delivery?.pickupLabel,
      }),
      dropoffPlace: placeLabel({
        address: b.dropoffAddress,
        name: b.dropoffAirport?.name,
        city: b.dropoffAirport?.city,
        iata: b.dropoffAirport?.iata,
        fallback: b.delivery?.dropoffLabel,
      }),
      days,
    },
    lines,
    subtotalEur: settled.tripEur,
    totalEur: settled.chargedEur,
    depositPercent: settled.depositPercent,
    siteFeeEur: settled.siteFeeEur,
    cardSurchargeEur: settled.cardSurchargeEur,
    cardSurchargePercent: settled.cardSurchargePercent,
    onlineDueEur: settled.onlineEur,
    depositPaidEur,
    balanceDueEur,
    payments: [
      ...(settled.siteFeeEur > 0
        ? [
            {
              label: `${L.deposit} (${settled.depositPercent}%)`,
              method: L.depositMethod,
              amountEur: settled.siteFeeEur,
            },
          ]
        : []),
      ...(settled.cardSurchargeEur > 0
        ? [
            {
              label: `${L.card} (${settled.cardSurchargePercent}%)`,
              method: L.depositMethod,
              amountEur: settled.cardSurchargeEur,
            },
          ]
        : []),
      ...(balanceDueEur > 0
        ? [
            {
              label: L.balance,
              method: L.balanceMethod,
              amountEur: balanceDueEur,
            },
          ]
        : []),
    ],
    creditNotes,
    creditNotesTotalEur: roundMoney(pendingCreditEur + refundedCreditEur),
    pendingCreditEur,
    refundedCreditEur,
  };
}
