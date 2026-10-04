import { formatBookingRef, formatPartnerCode } from "@/lib/ids";
import { pickServiceLabel } from "@/lib/extras/service-label";
import {
  CARD_PICKUP_SURCHARGE_PERCENT,
  DEFAULT_DEPOSIT_PERCENT,
  roundMoney,
} from "@/lib/cars/reserve-pricing";
import { settleBookingMoney } from "@/lib/bookings/booking-money";
import { reconstructBpPreDiscountRental } from "@/lib/business-partner/referral-pricing";
import { resolveBookingDiscount } from "@/lib/pricing/booking-discount";
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
  promoCode?: string | null;
  /** Site discount % charged at checkout (0/undefined = none). */
  siteDiscountPercent?: number;
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

type InvoiceMoney = {
  rentalEur: number;
  dailyEur: number;
  promoDiscountEur: number;
  discountPercent: number;
  siteDiscount: boolean;
  settled: {
    tripEur: number;
    chargedEur: number;
    depositPercent: number;
    siteFeeEur: number;
    cardSurchargeEur: number;
    cardSurchargePercent: number;
    onlineEur: number;
    onSiteEur: number;
  };
};

/**
 * Money as stored on the booking (locked rate, corrections, promo), not the live listing price.
 * stored total = trip + card fee; stored deposit = site fee + card fee; stored balance = on site.
 */
function storedInvoiceMoney(input: {
  booking: InvoiceBookingInput;
  days: number;
  extrasEur: number;
  deliveryEur: number;
  depositPercent: number;
}): InvoiceMoney {
  const b = input.booking;
  const totalStored = roundMoney(Math.max(0, Number(b.totalPriceEur) || 0));
  const depositStored = roundMoney(Math.max(0, Number(b.depositPaidEur) || 0));

  if (totalStored <= 0.02 || depositStored <= 0.02) {
    const daily = roundMoney(Number(b.car.dailyRateEur) || 0);
    const rentalEur = roundMoney(daily * input.days);
    const settled = settleBookingMoney({
      rentalEur,
      extrasEur: input.extrasEur,
      deliveryEur: input.deliveryEur,
      depositPercent: input.depositPercent,
    });
    return { rentalEur, dailyEur: daily, promoDiscountEur: 0, discountPercent: 0, siteDiscount: false, settled };
  }

  const siteFee = roundMoney(depositStored / (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100));
  const card = roundMoney(Math.max(0, depositStored - siteFee));
  const trip = roundMoney(Math.max(0, totalStored - card));
  const storedBalance = Number(b.balanceDueEur);
  const onSite =
    Number.isFinite(storedBalance) && Math.abs(storedBalance + siteFee - trip) <= 0.05
      ? roundMoney(Math.max(0, storedBalance))
      : roundMoney(Math.max(0, trip - siteFee));

  const discount = resolveBookingDiscount({
    promoCode: b.promoCode,
    siteDiscountPercent: b.siteDiscountPercent,
  });
  const rentalEur = discount
    ? reconstructBpPreDiscountRental({
        totalPriceEur: totalStored,
        depositPaidEur: depositStored,
        extrasEur: input.extrasEur,
        deliveryEur: input.deliveryEur,
        discountPercent: discount.percent,
      })
    : roundMoney(Math.max(0, trip - input.extrasEur - input.deliveryEur));
  const promoDiscountEur = discount
    ? roundMoney(Math.max(0, rentalEur + input.extrasEur + input.deliveryEur - trip))
    : 0;
  const dailyEur = input.days > 0 ? roundMoney(rentalEur / input.days) : rentalEur;

  return {
    rentalEur,
    dailyEur,
    promoDiscountEur,
    discountPercent: discount?.percent ?? 0,
    siteDiscount: Boolean(discount?.cardOnDiscountedFee),
    settled: {
      tripEur: trip,
      chargedEur: totalStored,
      depositPercent: input.depositPercent,
      siteFeeEur: siteFee,
      cardSurchargeEur: card,
      cardSurchargePercent: CARD_PICKUP_SURCHARGE_PERCENT,
      onlineEur: depositStored,
      onSiteEur: onSite,
    },
  };
}

export function buildBookingInvoiceDocument(input: {
  booking: InvoiceBookingInput;
  issuer: InvoiceIssuer;
  refunds?: InvoiceRefundInput[];
  locale?: string;
}): BookingInvoiceDocument {
  const b = input.booking;
  const days = rentalDayCount(b.pickupAt, b.dropoffAt);
  const deliveryTotal = roundMoney(Number(b.delivery?.totalFeeEur) || 0);
  const extras = Array.isArray(b.extras) ? b.extras : [];
  const pickupFee = roundMoney(Math.max(0, Number(b.delivery?.pickupFeeEur) || 0));
  const dropoffFee = roundMoney(Math.max(0, Number(b.delivery?.dropoffFeeEur) || 0));
  const deliveryCharged =
    pickupFee + dropoffFee > 0 ? roundMoney(pickupFee + dropoffFee) : deliveryTotal;
  const extrasCharged = roundMoney(
    extras.reduce((sum, ex) => sum + Math.max(0, Number(ex.priceEur) || 0), 0),
  );
  const rawPercent = Number(b.depositPercent);
  const depositPercent = Number.isFinite(rawPercent) ? rawPercent : DEFAULT_DEPOSIT_PERCENT;
  const money = storedInvoiceMoney({
    booking: b,
    days,
    extrasEur: extrasCharged,
    deliveryEur: deliveryCharged,
    depositPercent,
  });
  const daily = money.dailyEur;
  const rentalTotal = money.rentalEur;

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
          promo: "Promo discount",
          siteDiscount: "Site discount",
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
            promo: "Скидка по промокоду",
            siteDiscount: "Скидка сайта",
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
            promo: "პრომო ფასდაკლება",
            siteDiscount: "საიტის ფასდაკლება",
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
  for (const ex of extras) {
    const description = pickServiceLabel(ex.label);
    if (!description) continue;
    const total = roundMoney(Math.max(0, Number(ex.priceEur) || 0));
    const qty = Math.max(1, Number(ex.qty) || 1);
    lines.push({
      sku: `EXTRA-${ex.id}`.slice(0, 40),
      description,
      quantity: qty,
      unitPriceEur: qty > 0 ? roundMoney(total / qty) : 0,
      totalEur: total,
    });
  }

  if (money.promoDiscountEur > 0.009) {
    lines.push({
      sku: "PROMO",
      description: `${money.siteDiscount ? L.siteDiscount : L.promo} (−${money.discountPercent}%)`,
      quantity: 1,
      unitPriceEur: -money.promoDiscountEur,
      totalEur: -money.promoDiscountEur,
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

  const settled = money.settled;
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
