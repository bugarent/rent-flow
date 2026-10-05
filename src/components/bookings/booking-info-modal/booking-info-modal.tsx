"use client";

import { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatBookingRef } from "@/lib/ids";
import {
  CARD_PICKUP_SURCHARGE_PERCENT,
  computeProjectedTripSettlement,
  DEFAULT_DEPOSIT_PERCENT,
  roundMoney,
} from "@/lib/cars/reserve-pricing";
import { resolveBookingDiscount } from "@/lib/pricing/booking-discount";
import {
  bpCancelSiteFeeEur,
  computeBpProjectedTripSettlement,
  applyBusinessPartnerCustomerDiscount,
  reconstructBpPreDiscountRental,
} from "@/lib/business-partner/referral-pricing";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import { cn } from "@/lib/utils";
import { buildRefundChanges } from "@/lib/bookings/refund-change-details";
import {
  commissionableTripEur,
  guestCancelSettlement,
} from "@/lib/bookings/guest-cancellation";
import { isActiveBookingStatus, rentalHasEnded } from "@/lib/bookings/table-filters";
import { formatRegistrationNumberDisplay } from "@/lib/cars/registration-number";
import { copyFor } from "./copy";
import {
  daysBetween,
  deliveryPlaceLineLabel,
  formatPlaceLabel,
  legFeeForLocation,
  statusLabel,
  toLocalInput,
} from "./helpers";
import { airportLocalToUtc } from "@/lib/datetime/airport-timezone";
import { catalogTimezoneForIata } from "@/lib/locations/booking-datetime";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { GuestCancelDialog } from "./guest-cancel-dialog";
import { CheckoutPaypalSandbox } from "@/components/cars/checkout-paypal-sandbox";
import { HeaderBanners } from "./sections/header-banners";
import { CarAside } from "./sections/car-aside";
import { PartnerSection } from "./sections/partner-section";
import { GuestSection } from "./sections/guest-section";
import { PeriodSection } from "./sections/period-section";
import { FooterActions } from "./sections/footer-actions";
import { PartnerPriceBar } from "./sections/partner-price-bar";
import type {
  BookingInfoData,
  BookingInfoExtra,
  BookingInfoLocationOption,
  BookingInfoRole,
  CatalogExtra,
} from "./types";

export function BookingInfoModal({
  open,
  booking,
  locale,
  role,
  catalogExtras = [],
  hidePartnerSection = false,
  calendarView = false,
  onClose,
  onSaved,
  onConfirmPending,
  onDelete,
  onOpenInvoice,
}: {
  open: boolean;
  booking: BookingInfoData;
  locale: string;
  role: BookingInfoRole;
  catalogExtras?: CatalogExtra[];
  /** Hide owner/partner contact block (e.g. partner calendar self-view). */
  hidePartnerSection?: boolean;
  /**
   * Compact calendar-only layout (size, fields, no scroll, plate formatting).
   * Bookings list / admin / guest keep the original modal when this is false.
   */
  calendarView?: boolean;
  onClose: () => void;
  onSaved?: (booking?: BookingInfoData) => void;
  onConfirmPending?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onOpenInvoice?: () => void;
}) {
  const t = copyFor(locale);
  const canEditAll = role === "admin";
  const canEditGuestFields = role === "guest";
  const readOnly = role === "partner";
  const canEditExtras = canEditAll || canEditGuestFields;
  const hidePartner = hidePartnerSection || calendarView;
  /** Customer manage-booking lookup — shorter info cards only. */
  const guestCompact = canEditGuestFields && !calendarView;

  const ref =
    booking.reference ||
    formatBookingRef(booking.sequentialNumber) ||
    booking.id.slice(0, 8);
  const partnerPlate = readOnly
    ? calendarView
      ? formatRegistrationNumberDisplay(booking.car.registrationNumber)
      : String(booking.car.registrationNumber || "").trim().toUpperCase()
    : "";
  const ended =
    canEditGuestFields &&
    isActiveBookingStatus(booking.status) &&
    (booking.status === "COMPLETED" || rentalHasEnded(booking.dropoffAt));

  const [depositPercent, setDepositPercent] = useState(
    () =>
      typeof booking.depositPercent === "number" && Number.isFinite(booking.depositPercent)
        ? Math.trunc(booking.depositPercent)
        : DEFAULT_DEPOSIT_PERCENT,
  );

  useEffect(() => {
    if (typeof booking.depositPercent === "number" && Number.isFinite(booking.depositPercent)) {
      setDepositPercent(Math.trunc(booking.depositPercent));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform/deposit", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { depositPercent?: number };
        if (
          typeof data.depositPercent === "number" &&
          Number.isFinite(data.depositPercent) &&
          !cancelled
        ) {
          setDepositPercent(Math.trunc(data.depositPercent));
        }
      } catch {
        /* keep booking / default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booking.id, booking.depositPercent]);

  const days = daysBetween(booking.pickupAt, booking.dropoffAt);
  const extras = booking.extras || [];
  const extrasTotal = extras.reduce((s, e) => s + (Number(e.priceEur) || 0), 0);
  const carDailyFromListing = roundMoney(Number(booking.car.dailyRateEur) || 0);
  const originalDeliveryHint = roundMoney(
    Number(booking.delivery?.totalFeeEur) ||
      (Number(booking.delivery?.pickupFeeEur) || 0) + (Number(booking.delivery?.dropoffFeeEur) || 0),
  );
  const bookingDiscount = useMemo(
    () =>
      resolveBookingDiscount({
        promoCode: booking.promoCode,
        siteDiscountPercent: booking.siteDiscountPercent,
      }),
    [booking.promoCode, booking.siteDiscountPercent],
  );
  const bpPromo = Boolean(bookingDiscount);
  const discountPercent = bookingDiscount?.percent ?? 0;
  // Create-booking stores totalPrice = trip components + card surcharge on the deposit.
  const depositPaidHint = roundMoney(booking.depositPaidEur || 0);
  const depositBaseHint = roundMoney(
    depositPaidHint / (1 + CARD_PICKUP_SURCHARGE_PERCENT / 100),
  );
  const surchargeInTotalHint = roundMoney(Math.max(0, depositPaidHint - depositBaseHint));
  const rentalFromTotal = Math.max(
    0,
    roundMoney(
      (booking.totalPriceEur || 0) - extrasTotal - originalDeliveryHint - surchargeInTotalHint,
    ),
  );
  // BP promo: extras are stored full-price while total is discounted — reconstruct rental.
  const rentalPreDiscount = bpPromo
    ? reconstructBpPreDiscountRental({
        totalPriceEur: booking.totalPriceEur || 0,
        depositPaidEur: booking.depositPaidEur || 0,
        extrasEur: extrasTotal,
        deliveryEur: originalDeliveryHint,
        discountPercent,
      })
    : rentalFromTotal;
  // Prefer the rate locked into this booking — listing prices change and must not
  // rewrite totals on guest/partner/admin review surfaces.
  const bookedDaily =
    days > 0 && rentalPreDiscount > 0.02 ? roundMoney(rentalPreDiscount / days) : 0;
  const daily =
    bookedDaily > 0
      ? bookedDaily
      : carDailyFromListing > 0
        ? carDailyFromListing
        : days > 0
          ? roundMoney(rentalPreDiscount / days)
          : rentalPreDiscount;

  const resolvedCatalog = useMemo(() => {
    const fromBooking = (booking as BookingInfoData & { catalogExtras?: CatalogExtra[] }).catalogExtras;
    const base = catalogExtras.length ? catalogExtras : fromBooking || [];
    const byId = new Map(base.map((e) => [e.id, e]));
    for (const ex of extras) {
      if (!byId.has(ex.id)) {
        byId.set(ex.id, {
          id: ex.id,
          label: ex.label,
          priceEurPerDay: days > 0 ? roundMoney((Number(ex.priceEur) || 0) / days) : Number(ex.priceEur) || 0,
          locked: false,
        });
      }
    }
    return [...byId.values()];
  }, [catalogExtras, booking, extras, days]);

  const lockedExtraIds = useMemo(
    () => new Set(resolvedCatalog.filter((e) => e.locked).map((e) => e.id)),
    [resolvedCatalog],
  );

  const pickupTz =
    booking.pickupAirport?.timezone ||
    catalogTimezoneForIata(booking.pickupAirport?.iata || "", CATALOG_AIRPORTS);
  const dropoffTz =
    booking.dropoffAirport?.timezone ||
    catalogTimezoneForIata(booking.dropoffAirport?.iata || "", CATALOG_AIRPORTS);
  const start = toLocalInput(booking.pickupAt, pickupTz);
  const end = toLocalInput(booking.dropoffAt, dropoffTz);
  const [editingDates, setEditingDates] = useState(false);
  const [pickupDate, setPickupDate] = useState(start.date);
  const [pickupTime, setPickupTime] = useState(start.time);
  const [dropoffDate, setDropoffDate] = useState(end.date);
  const [dropoffTime, setDropoffTime] = useState(end.time);
  const [pickupIata, setPickupIata] = useState(booking.pickupAirport?.iata || "");
  const [dropoffIata, setDropoffIata] = useState(booking.dropoffAirport?.iata || "");
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(
    () => new Set(extras.map((e) => e.id)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [driverFirst, setDriverFirst] = useState(booking.guestFirstName || "");
  const [driverLast, setDriverLast] = useState(booking.guestLastName || "");
  const [driverEmail, setDriverEmail] = useState(booking.guestEmail || "");
  const [driverPhone, setDriverPhone] = useState(booking.guestPhone || "");

  useEffect(() => {
    setSelectedExtraIds(() => {
      const next = new Set((booking.extras || []).map((e) => e.id));
      for (const id of lockedExtraIds) next.add(id);
      return next;
    });
    setPickupIata(booking.pickupAirport?.iata || "");
    setDropoffIata(booking.dropoffAirport?.iata || "");
    const s = toLocalInput(booking.pickupAt, pickupTz);
    const e = toLocalInput(booking.dropoffAt, dropoffTz);
    setPickupDate(s.date);
    setPickupTime(s.time);
    setDropoffDate(e.date);
    setDropoffTime(e.time);
    setDriverFirst(booking.guestFirstName || "");
    setDriverLast(booking.guestLastName || "");
    setDriverEmail(booking.guestEmail || "");
    setDriverPhone(booking.guestPhone || "");
  }, [booking.id, booking.extras, booking.pickupAt, booking.dropoffAt, booking.pickupAirport?.iata, booking.dropoffAirport?.iata, booking.pickupAirport?.timezone, booking.dropoffAirport?.timezone, booking.guestFirstName, booking.guestLastName, booking.guestEmail, booking.guestPhone, lockedExtraIds, pickupTz, dropoffTz]);

  useEffect(() => {
    if (!open) {
      setPaymentOpen(false);
      setCancelOpen(false);
    }
  }, [open]);

  // Keep mandatory extras selected if catalog loads after booking extras.
  useEffect(() => {
    if (!lockedExtraIds.size) return;
    setSelectedExtraIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of lockedExtraIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [lockedExtraIds]);

  const locationOptions: BookingInfoLocationOption[] = booking.locationOptions?.length
    ? booking.locationOptions
    : [
        ...(booking.pickupAirport?.iata
          ? [
              {
                iata: booking.pickupAirport.iata,
                label: formatPlaceLabel({
                  name: booking.pickupAirport.name,
                  city: booking.pickupAirport.city,
                  iata: booking.pickupAirport.iata,
                }),
                priceEur: Number(booking.delivery?.pickupFeeEur) || 0,
                freeAfterDays: null,
              },
            ]
          : []),
        ...(booking.dropoffAirport?.iata &&
        booking.dropoffAirport.iata !== booking.pickupAirport?.iata
          ? [
              {
                iata: booking.dropoffAirport.iata,
                label: formatPlaceLabel({
                  name: booking.dropoffAirport.name,
                  city: booking.dropoffAirport.city,
                  iata: booking.dropoffAirport.iata,
                }),
                priceEur: Number(booking.delivery?.dropoffFeeEur) || 0,
                freeAfterDays: null,
              },
            ]
          : []),
      ];

  const periodDays = daysBetween(
    `${pickupDate}T${pickupTime}:00`,
    `${dropoffDate}T${dropoffTime}:00`,
  );

  const liveDelivery = useMemo(() => {
    const puCode = String(pickupIata || booking.pickupAirport?.iata || "").toUpperCase();
    const doCode = String(dropoffIata || booking.dropoffAirport?.iata || puCode).toUpperCase();
    const byIata = new Map(
      locationOptions.map((l) => [String(l.iata || "").toUpperCase(), l] as const),
    );
    const puLoc = byIata.get(puCode);
    const doLoc = byIata.get(doCode);
    const originalPu = String(booking.pickupAirport?.iata || "").toUpperCase();
    const originalDo = String(booking.dropoffAirport?.iata || "").toUpperCase();
    const pickupFeeEur = legFeeForLocation(
      puLoc,
      periodDays,
      puCode === originalPu ? Number(booking.delivery?.pickupFeeEur) || 0 : 0,
    );
    const dropoffFeeEur = legFeeForLocation(
      doLoc,
      periodDays,
      doCode === originalDo ? Number(booking.delivery?.dropoffFeeEur) || 0 : 0,
    );
    return {
      pickupIata: puCode,
      dropoffIata: doCode,
      pickupLabel: booking.pickupAddress?.trim()
        ? formatPlaceLabel({
            address: booking.pickupAddress,
            name: puLoc?.label || booking.delivery?.pickupLabel || booking.pickupAirport?.name,
            city: booking.pickupAirport?.city,
            iata: puCode,
          })
        : deliveryPlaceLineLabel(
            puCode,
            puLoc?.label || booking.delivery?.pickupLabel || puCode,
          ),
      dropoffLabel: booking.dropoffAddress?.trim()
        ? formatPlaceLabel({
            address: booking.dropoffAddress,
            name: doLoc?.label || booking.delivery?.dropoffLabel || booking.dropoffAirport?.name,
            city: booking.dropoffAirport?.city,
            iata: doCode,
          })
        : deliveryPlaceLineLabel(
            doCode,
            doLoc?.label || booking.delivery?.dropoffLabel || doCode,
          ),
      pickupFeeEur,
      dropoffFeeEur,
      totalFeeEur: roundMoney(pickupFeeEur + dropoffFeeEur),
    };
  }, [
    pickupIata,
    dropoffIata,
    periodDays,
    locationOptions,
    booking.pickupAirport?.iata,
    booking.dropoffAirport?.iata,
    booking.delivery?.pickupFeeEur,
    booking.delivery?.dropoffFeeEur,
    booking.delivery?.pickupLabel,
    booking.delivery?.dropoffLabel,
    booking.pickupAddress,
    booking.dropoffAddress,
    booking.pickupAirport?.city,
    booking.dropoffAirport?.city,
    booking.pickupAirport?.name,
    booking.dropoffAirport?.name,
  ]);

  const deliveryTotal = liveDelivery.totalFeeEur;

  const extrasPaymentBreakdown = useMemo(() => {
    // Time selects snap to 30 minutes — until the guest changes date/time, keep the
    // booked day count so rounding cannot invent a shorter trip + false refund.
    const periodPristine =
      pickupDate === start.date &&
      dropoffDate === end.date &&
      pickupTime === start.time &&
      dropoffTime === end.time;
    const newDays = periodPristine
      ? days
      : daysBetween(
          `${pickupDate}T${pickupTime}:00`,
          `${dropoffDate}T${dropoffTime}:00`,
        );
    let projectedExtras = 0;
    let newExtrasCommissionableEur = 0;
    const originalExtraIds = new Set(extras.map((e) => e.id));
    const bookedExtraById = new Map(extras.map((e) => [e.id, e] as const));
    if (canEditGuestFields || canEditAll) {
      for (const ex of resolvedCatalog) {
        if (!selectedExtraIds.has(ex.id) && !ex.locked) continue;
        const booked = bookedExtraById.get(ex.id);
        // Keep the rate the guest already paid for; live catalog prices only for new extras.
        const perDay =
          booked && days > 0
            ? roundMoney((Number(booked.priceEur) || 0) / days)
            : ex.priceEurPerDay;
        const line = roundMoney(
          extraPeriodCharge(perDay, newDays, 1, ex.maxPeriodEur, ex.minPeriodEur),
        );
        projectedExtras += line;
        if (!originalExtraIds.has(ex.id)) {
          newExtrasCommissionableEur += line;
        }
      }
      projectedExtras = roundMoney(projectedExtras);
      newExtrasCommissionableEur = roundMoney(newExtrasCommissionableEur);
    } else {
      for (const ex of extras) {
        projectedExtras += Number(ex.priceEur) || 0;
      }
      projectedExtras = roundMoney(projectedExtras);
    }
    const originalIataPickup = String(booking.pickupAirport?.iata || "").toUpperCase();
    const originalIataDropoff = String(booking.dropoffAirport?.iata || "").toUpperCase();
    const currentIataPickup = String(pickupIata || originalIataPickup).toUpperCase();
    const currentIataDropoff = String(dropoffIata || originalIataDropoff).toUpperCase();
    const locationsChanged =
      currentIataPickup !== originalIataPickup || currentIataDropoff !== originalIataDropoff;
    const daysChanged = newDays !== days;
    const tripUnchanged = !daysChanged && !locationsChanged;

    const originalRental = roundMoney(daily * days);
    const projectedRental = roundMoney(daily * newDays);
    const byIata = new Map(
      locationOptions.map((l) => [String(l.iata || "").toUpperCase(), l] as const),
    );
    const originalDelivery = roundMoney(
      Number(booking.delivery?.totalFeeEur) ||
        legFeeForLocation(byIata.get(originalIataPickup), days, 0) +
          legFeeForLocation(byIata.get(originalIataDropoff), days, 0),
    );
    const projectedDelivery = deliveryTotal;
    const deliveryDelta = roundMoney(projectedDelivery - originalDelivery);

    const settlement = bpPromo
      ? computeBpProjectedTripSettlement({
          originalRentalEur: originalRental,
          originalExtrasEur: extrasTotal,
          originalDeliveryEur: originalDelivery,
          projectedRentalEur: projectedRental,
          projectedExtrasEur: projectedExtras,
          projectedDeliveryEur: projectedDelivery,
          depositPaidEur: booking.depositPaidEur || 0,
          balanceDueEur: booking.balanceDueEur,
          depositPercent,
          discount: bookingDiscount ?? undefined,
        })
      : computeProjectedTripSettlement({
          originalRentalEur: originalRental,
          originalExtrasEur: extrasTotal,
          originalDeliveryEur: originalDelivery,
          projectedRentalEur: projectedRental,
          projectedExtrasEur: projectedExtras,
          projectedDeliveryEur: projectedDelivery,
          depositPaidEur: booking.depositPaidEur || 0,
          balanceDueEur: booking.balanceDueEur,
          depositPercent,
          newExtrasCommissionableEur,
        });
    const totalDelta = roundMoney(settlement.projectedComponents - settlement.originalComponents);
    // On-site movement from trip/delivery edits + partner share of newly added extras only.
    const onSiteAdded = Math.max(
      0,
      roundMoney(settlement.onSiteCommissionableDelta + Math.max(0, deliveryDelta)),
    );
    const payNow = settlement.payNow;
    const payNowBase = settlement.payNowBase;
    const dueWill = settlement.dueWill;

    const displayOriginalRental = bpPromo
      ? applyBusinessPartnerCustomerDiscount(originalRental, discountPercent)
      : originalRental;
    const displayProjectedRental = bpPromo
      ? applyBusinessPartnerCustomerDiscount(projectedRental, discountPercent)
      : projectedRental;

    return {
      originalDays: days,
      newDays,
      dayDelta: newDays - days,
      daysChanged,
      locationsChanged,
      originalRental: displayOriginalRental,
      projectedRental: displayProjectedRental,
      rentalDelta: roundMoney(displayProjectedRental - displayOriginalRental),
      originalDelivery,
      projectedDelivery,
      deliveryDelta,
      tripChanged: !tripUnchanged,
      projectedExtras: bpPromo
        ? applyBusinessPartnerCustomerDiscount(projectedExtras, discountPercent)
        : projectedExtras,
      originalComponents: settlement.originalComponents,
      projectedComponents: settlement.projectedComponents,
      addedServicesTotal: onSiteAdded,
      payNow,
      payNowBase,
      dueWas: settlement.dueWas,
      dueWill,
      /** Trip total shown in UI (rental + extras + delivery). */
      projectedTotal: settlement.projectedComponents,
      /** Value persisted as booking.totalPriceEur (components + deposit card surcharge). */
      persistTotalEur: settlement.projectedTotal,
      liveBalanceDue: dueWill,
      nextDepositPaidEur: settlement.nextDepositPaidEur,
      nextBalanceDueEur: dueWill,
      depositPercent: settlement.depositPercent,
      siteFeeEur: roundMoney(Math.max(0, settlement.siteFeeEur - payNowBase)),
      cardSurchargeEur: roundMoney(
        Math.max(0, settlement.cardSurchargeEur - roundMoney(payNow - payNowBase)),
      ),
      refundableSiteFeeEur: settlement.refundableSiteFeeEur,
      totalDelta,
    };
  }, [
    canEditGuestFields,
    canEditAll,
    selectedExtraIds,
    resolvedCatalog,
    extras,
    extrasTotal,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    start.date,
    start.time,
    end.date,
    end.time,
    pickupIata,
    dropoffIata,
    depositPercent,
    daily,
    days,
    deliveryTotal,
    locationOptions,
    booking.depositPaidEur,
    booking.balanceDueEur,
    booking.pickupAirport?.iata,
    booking.dropoffAirport?.iata,
    booking.delivery?.totalFeeEur,
    booking.delivery?.pickupFeeEur,
    booking.delivery?.dropoffFeeEur,
    bpPromo,
    bookingDiscount,
    discountPercent,
  ]);

  const liveTotal = extrasPaymentBreakdown.projectedTotal;
  const newExtrasPayNow = extrasPaymentBreakdown.payNow;

  const canCancelGuest =
    canEditGuestFields &&
    !ended &&
    (booking.status === "PENDING" || booking.status === "CONFIRMED");

  const cancelSettlement = useMemo(() => {
    const rentalEur = roundMoney(daily * days);
    const commissionableEur = bpPromo
      ? roundMoney(rentalEur + extrasTotal)
      : commissionableTripEur({
          totalPriceEur: booking.totalPriceEur || 0,
          depositPaidEur: booking.depositPaidEur || 0,
          deliveryEur: originalDeliveryHint,
        });
    const siteFeeEurOverride = bpPromo
      ? bpCancelSiteFeeEur({
          rentalEur,
          extrasEur: extrasTotal,
          deliveryEur: originalDeliveryHint,
          depositPercent,
          discount: bookingDiscount ?? undefined,
        })
      : undefined;
    return guestCancelSettlement({
      pickupAt: booking.pickupAt,
      extras: booking.extras,
      depositPaidEur: booking.depositPaidEur || 0,
      depositPercent,
      commissionableEur,
      siteFeeEurOverride,
    });
  }, [
    booking.pickupAt,
    booking.extras,
    booking.depositPaidEur,
    booking.totalPriceEur,
    depositPercent,
    originalDeliveryHint,
    bpPromo,
    bookingDiscount,
    daily,
    days,
    extrasTotal,
  ]);

  if (!open) return null;

  const guestName =
    [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(" ").trim() || "—";
  const pickupPlace = formatPlaceLabel({
    address: booking.pickupAddress,
    name: booking.pickupAirport?.name,
    city: booking.pickupAirport?.city,
    iata: booking.pickupAirport?.iata,
  });
  const dropoffPlace = formatPlaceLabel({
    address: booking.dropoffAddress,
    name: booking.dropoffAirport?.name,
    city: booking.dropoffAirport?.city,
    iata: booking.dropoffAirport?.iata,
  });

  const saveAdmin = async () => {
    setBusy(true);
    setError("");
    try {
      const savePickupTz =
        catalogTimezoneForIata(pickupIata || booking.pickupAirport?.iata || "", CATALOG_AIRPORTS) ||
        pickupTz;
      const saveDropoffTz =
        catalogTimezoneForIata(dropoffIata || booking.dropoffAirport?.iata || "", CATALOG_AIRPORTS) ||
        dropoffTz;
      const pickupAt = airportLocalToUtc(pickupDate, pickupTime, savePickupTz).toISOString();
      const dropoffAt = airportLocalToUtc(dropoffDate, dropoffTime, saveDropoffTz).toISOString();
      const newDays = daysBetween(pickupAt, dropoffAt);
      const nextExtras: BookingInfoExtra[] = [];
      for (const ex of resolvedCatalog) {
        if (!selectedExtraIds.has(ex.id) && !ex.locked) continue;
        const existing = extras.find((e) => e.id === ex.id);
        const perDay =
          existing && days > 0
            ? roundMoney((Number(existing.priceEur) || 0) / days)
            : ex.priceEurPerDay;
        nextExtras.push({
          id: ex.id,
          label: ex.label,
          priceEur: roundMoney(
            extraPeriodCharge(perDay, newDays, 1, ex.maxPeriodEur, ex.minPeriodEur),
          ),
          ...(existing?.qty != null ? { qty: existing.qty } : {}),
        });
      }
      const refundChanges =
        extrasPaymentBreakdown.refundableSiteFeeEur > 0
          ? buildRefundChanges({
              pickupFrom: booking.pickupAt,
              pickupTo: pickupAt,
              dropoffFrom: booking.dropoffAt,
              dropoffTo: dropoffAt,
              previousExtras: extras,
              nextExtras,
              rentalFromEur: extrasPaymentBreakdown.originalRental,
              rentalToEur: extrasPaymentBreakdown.projectedRental,
              rentalLabel: t.carRental,
              deliveryFromEur: extrasPaymentBreakdown.originalDelivery,
              deliveryToEur: extrasPaymentBreakdown.projectedDelivery,
              deliveryLabel: t.deliveryInfo,
              depositPercent,
            })
          : [];
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestFirstName: driverFirst.trim(),
          guestLastName: driverLast.trim(),
          guestEmail: driverEmail.trim(),
          guestPhone: driverPhone.trim(),
          pickupAt,
          dropoffAt,
          pickupAirportIata: pickupIata || undefined,
          dropoffAirportIata: dropoffIata || undefined,
          extras: nextExtras,
          totalPriceEur: extrasPaymentBreakdown.persistTotalEur,
          depositPaidEur: extrasPaymentBreakdown.nextDepositPaidEur,
          balanceDueEur: extrasPaymentBreakdown.nextBalanceDueEur,
          refundableSiteFeeEur: extrasPaymentBreakdown.refundableSiteFeeEur,
          ...(refundChanges.length ? { refundChanges } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Failed"));
      setEditingDates(false);
      if (data.booking) onSaved?.(data.booking as BookingInfoData);
      else onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitGuestChanges = async (payNow: boolean) => {
    if (payNow && newExtrasPayNow > 0) {
      setPaymentOpen(true);
      setError("");
      return;
    }
    await persistGuestChanges(false);
  };

  const persistGuestChanges = async (payNow: boolean) => {
    if (!payNow && extrasPaymentBreakdown.payNow > 0.009) {
      setPaymentOpen(true);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const savePickupTz =
        catalogTimezoneForIata(pickupIata || booking.pickupAirport?.iata || "", CATALOG_AIRPORTS) ||
        pickupTz;
      const saveDropoffTz =
        catalogTimezoneForIata(dropoffIata || booking.dropoffAirport?.iata || "", CATALOG_AIRPORTS) ||
        dropoffTz;
      const pickupAt = airportLocalToUtc(pickupDate, pickupTime, savePickupTz).toISOString();
      const dropoffAt = airportLocalToUtc(dropoffDate, dropoffTime, saveDropoffTz).toISOString();
      const newDays = daysBetween(pickupAt, dropoffAt);
      const nextExtras: BookingInfoExtra[] = [];
      for (const ex of resolvedCatalog) {
        if (!selectedExtraIds.has(ex.id) && !ex.locked) continue;
        const existing = extras.find((e) => e.id === ex.id);
        const perDay =
          existing && days > 0
            ? roundMoney((Number(existing.priceEur) || 0) / days)
            : ex.priceEurPerDay;
        nextExtras.push({
          id: ex.id,
          label: ex.label,
          priceEur: roundMoney(
            extraPeriodCharge(perDay, newDays, 1, ex.maxPeriodEur, ex.minPeriodEur),
          ),
          ...(existing?.qty != null ? { qty: existing.qty } : {}),
        });
      }
      const refundChanges =
        extrasPaymentBreakdown.refundableSiteFeeEur > 0
          ? buildRefundChanges({
              pickupFrom: booking.pickupAt,
              pickupTo: pickupAt,
              dropoffFrom: booking.dropoffAt,
              dropoffTo: dropoffAt,
              previousExtras: extras,
              nextExtras,
              rentalFromEur: extrasPaymentBreakdown.originalRental,
              rentalToEur: extrasPaymentBreakdown.projectedRental,
              rentalLabel: t.carRental,
              deliveryFromEur: extrasPaymentBreakdown.originalDelivery,
              deliveryToEur: extrasPaymentBreakdown.projectedDelivery,
              deliveryLabel: t.deliveryInfo,
              depositPercent,
            })
          : [];
      const res = await fetch("/api/bookings/guest-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          email: booking.guestEmail,
          pickupAt,
          dropoffAt,
          pickupAirportIata: pickupIata || undefined,
          dropoffAirportIata: dropoffIata || undefined,
          extras: nextExtras,
          replaceExtras: true,
          extrasPayNowEur: payNow ? newExtrasPayNow : 0,
          projectedTotalEur: extrasPaymentBreakdown.persistTotalEur,
          depositPaidEur: extrasPaymentBreakdown.nextDepositPaidEur,
          balanceDueEur: extrasPaymentBreakdown.nextBalanceDueEur,
          refundableSiteFeeEur: extrasPaymentBreakdown.refundableSiteFeeEur,
          ...(refundChanges.length ? { refundChanges } : {}),
          paymentMode: payNow ? "sandbox" : undefined,
          paymentProvider: payNow ? "paypal" : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Failed"));
      setEditingDates(false);
      setPaymentOpen(false);
      if (data.booking) onSaved?.(data.booking as BookingInfoData);
      else onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteBooking = async () => {
    if (!onDelete) return;
    if (typeof window !== "undefined" && !window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    setError("");
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmGuestCancel = async (reason: string) => {
    const email = (booking.guestEmail || "").trim();
    if (!email) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/guest-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, email, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Failed"));
      setCancelOpen(false);
      if (data.booking) onSaved?.(data.booking as BookingInfoData);
      else onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[250] flex items-end justify-center bg-black/45 sm:items-center",
        calendarView ? "p-1.5 sm:p-3" : "p-2 sm:p-4",
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden shadow-2xl",
          calendarView
            ? "h-auto max-h-[min(92dvh,960px)] max-w-5xl rounded-xl border-2 border-slate-300 bg-slate-200"
            : "max-h-[94dvh] max-w-5xl rounded-2xl bg-[#f4f6fa]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "z-10 flex shrink-0 items-center justify-between gap-2 border-b bg-white",
            calendarView
              ? "border-b-2 border-slate-300 px-3 py-1.5 sm:px-3.5"
              : "border-slate-200 px-4 py-3 sm:px-5",
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "font-mono font-black text-[#0b1f4b]",
                calendarView ? "text-sm" : "text-lg",
              )}
            >
              {ref}
            </span>
            <span
              className={cn(
                "rounded-full font-bold",
                calendarView ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                booking.status === "CANCELLED"
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : booking.status === "UNFULFILLED" || ended
                    ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
              )}
            >
              {statusLabel(booking.status, t, ended)}
            </span>
            {partnerPlate ? (
              <span
                className={cn(
                  "rounded-full bg-slate-100 font-mono font-bold tracking-wide text-[#0b1f4b] ring-1 ring-slate-200",
                  calendarView ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                )}
              >
                {partnerPlate}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canCancelGuest ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setCancelOpen(true)}
                className={cn(
                  "rounded-md bg-rose-600 font-bold text-white hover:bg-rose-700 disabled:opacity-50",
                  calendarView ? "px-2.5 py-1 text-xs" : "rounded-lg px-3 py-1.5 text-sm",
                )}
              >
                {t.cancelBooking}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex items-center gap-1 font-semibold text-slate-600 hover:bg-slate-100",
                calendarView
                  ? "rounded-md px-1.5 py-1 text-xs"
                  : "rounded-lg px-2 py-1.5 text-sm",
              )}
            >
              <X className={calendarView ? "h-3.5 w-3.5" : "h-4 w-4"} />
              {t.back}
            </button>
          </div>
        </div>

        <div
          className={cn(
            calendarView
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3"
              : "min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5",
          )}
        >
          <div
            className={cn(
              calendarView
                ? "space-y-1.5 rounded-lg border-2 border-slate-300 bg-[#f8fafc] p-1.5 shadow-inner sm:p-2"
                : "contents",
            )}
          >
            <HeaderBanners
              t={t}
              locale={locale}
              booking={booking}
              role={role}
              readOnly={readOnly}
              canEditAll={canEditAll}
              busy={busy}
              error={error}
              onConfirmPending={onConfirmPending}
              calendarView={calendarView}
            />

            {!hidePartner && guestCompact ? (
              <div className="lg:hidden">
                <PartnerSection t={t} locale={locale} booking={booking} compact />
              </div>
            ) : null}

            <div
              className={cn(
                "grid",
                calendarView
                  ? "items-start gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,380px)]"
                  : guestCompact
                    ? "gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]"
                    : "gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]",
              )}
            >
              <CarAside
                t={t}
                locale={locale}
                booking={booking}
                role={role}
                daily={daily}
                periodDays={periodDays}
                liveDelivery={liveDelivery}
                extras={extras}
                resolvedCatalog={resolvedCatalog}
                selectedExtraIds={selectedExtraIds}
                setSelectedExtraIds={setSelectedExtraIds}
                canEditGuestFields={canEditGuestFields}
                canEditAll={canEditAll}
                canEditExtras={canEditExtras}
                readOnly={readOnly}
                calendarView={calendarView}
                compact={guestCompact}
              />

              <div
                className={cn(
                  "lg:col-start-1 lg:row-start-1",
                  calendarView ? "space-y-1.5" : guestCompact ? "space-y-2" : "space-y-4",
                )}
              >
                {hidePartner ? null : (
                  <div className={guestCompact ? "hidden lg:block" : undefined}>
                    <PartnerSection
                      t={t}
                      locale={locale}
                      booking={booking}
                      calendarView={calendarView}
                      compact={guestCompact}
                    />
                  </div>
                )}
                <GuestSection
                  t={t}
                  locale={locale}
                  booking={booking}
                  guestName={guestName}
                  canEditAll={canEditAll}
                  hideAge={canEditGuestFields}
                  editingDates={editingDates}
                  driverFirst={driverFirst}
                  driverLast={driverLast}
                  driverEmail={driverEmail}
                  driverPhone={driverPhone}
                  setDriverFirst={setDriverFirst}
                  setDriverLast={setDriverLast}
                  setDriverEmail={setDriverEmail}
                  setDriverPhone={setDriverPhone}
                  calendarView={calendarView}
                  compact={guestCompact}
                />
                <PeriodSection
                  t={t}
                  locale={locale}
                  booking={booking}
                  periodDays={periodDays}
                  liveTotal={liveTotal}
                  pickupPlace={pickupPlace}
                  dropoffPlace={dropoffPlace}
                  editingDates={editingDates}
                  setEditingDates={setEditingDates}
                  canEditAll={canEditAll}
                  canEditGuestFields={canEditGuestFields}
                  readOnly={readOnly}
                  pickupDate={pickupDate}
                  dropoffDate={dropoffDate}
                  pickupTime={pickupTime}
                  dropoffTime={dropoffTime}
                  pickupIata={pickupIata}
                  dropoffIata={dropoffIata}
                  setPickupDate={setPickupDate}
                  setDropoffDate={setDropoffDate}
                  setPickupTime={setPickupTime}
                  setDropoffTime={setDropoffTime}
                  setPickupIata={setPickupIata}
                  setDropoffIata={setDropoffIata}
                  locationOptions={locationOptions}
                  extrasPaymentBreakdown={extrasPaymentBreakdown}
                  calendarView={calendarView}
                  compact={guestCompact}
                />
              </div>
            </div>
          </div>
        </div>

        {readOnly ? (
          <PartnerPriceBar t={t} booking={booking} calendarView={calendarView} />
        ) : null}

        <FooterActions
          t={t}
          locale={locale}
          booking={booking}
          liveTotal={liveTotal}
          extrasPaymentBreakdown={extrasPaymentBreakdown}
          canEditAll={canEditAll}
          canEditGuestFields={canEditGuestFields}
          canEditExtras={canEditExtras}
          readOnly={readOnly}
          busy={busy}
          hideRefundable={cancelOpen}
          onSaveAdmin={saveAdmin}
          onSubmitGuestChanges={submitGuestChanges}
          onDeleteBooking={deleteBooking}
          onOpenInvoice={onOpenInvoice}
          onDelete={onDelete}
        />
      </div>
      <GuestCancelDialog
        t={t}
        open={cancelOpen}
        busy={busy}
        refundEur={cancelSettlement.refundEur}
        siteFeeEur={cancelSettlement.siteFeeEur}
        depositPercent={cancelSettlement.depositPercent}
        hoursLeft={cancelSettlement.hours}
        hasProtection={cancelSettlement.protection}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => void confirmGuestCancel(reason)}
      />
      {paymentOpen ? (
        <div
          className="absolute inset-0 z-[40] flex items-end justify-center bg-black/45 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="PayPal"
          onClick={(e) => {
            e.stopPropagation();
            setPaymentOpen(false);
            setError("");
          }}
        >
          <div
            className="w-full max-w-lg space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {error ? (
              <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>
            ) : null}
            <CheckoutPaypalSandbox
              amountLabel={`€${newExtrasPayNow.toFixed(2)}`}
              locale={locale}
              guestEmail={booking.guestEmail || driverEmail}
              loading={busy}
              backLabel={t.back}
              onBack={() => {
                setPaymentOpen(false);
                setError("");
              }}
              onConfirm={async () => {
                await persistGuestChanges(true);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
