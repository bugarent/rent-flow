"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Clock,
  Fuel,
  Gauge,
  Headset,
  HelpCircle,
  Info,
  Lock,
  Minus,
  Plus,
  Shield,
  Users,
  Car as CarIcon,
  Zap,
} from "lucide-react";
import { BirthDateSelect } from "@/components/cars/birth-date-select";
import { GuestBookingNoticeModal } from "@/components/cars/guest-booking-notice-modal";
import { ResidenceCountrySelect } from "@/components/cars/residence-country-select";
import { CheckoutCarGallery } from "@/components/cars/checkout-car-gallery";
import { CheckoutPaypalSandbox } from "@/components/cars/checkout-paypal-sandbox";
import { RentalTermsModal } from "@/components/cars/rental-terms-modal";
import { LegalDocumentModal } from "@/components/legal/legal-document-modal";
import { PhoneCountryField } from "@/components/partner/phone-country-field";
import { usePreferences } from "@/components/providers/preferences-context";
import { knownText } from "@/lib/i18n/known-record-text";
import {
  formatDepositLabel,
  formatFranchiseLabel,
  parseCarDetails,
  resolveFranchiseAmountEur,
  type CarDetailsBlob,
} from "@/lib/cars/car-details";
import {
  CARD_PICKUP_SURCHARGE_PERCENT,
  computeReserveTotals,
  DEFAULT_DEPOSIT_PERCENT,
  rentalDayCount,
  resolveDailyRateEur,
  roundMoney,
} from "@/lib/cars/reserve-pricing";
import { settleBookingMoney } from "@/lib/bookings/booking-money";
import { settleBusinessPartnerBookingMoney } from "@/lib/business-partner/referral-pricing";
import { useBusinessPartnerReferralDiscount } from "@/components/business/use-business-partner-referral-discount";
import { formatInternationalPhone } from "@/lib/catalog/dial-codes";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import type { PartnerSocialPlatform } from "@/lib/partner";
import { cn, toNumber } from "@/lib/utils";
import { formatBookingRef } from "@/lib/ids";
import {
  clearBusinessPartnerReferralCookieClient,
  getBusinessPartnerReferralRemainingMsClient,
  readBusinessPartnerReferralCookieClient,
} from "@/lib/business-partner/codes";
import { CheckoutInsurancePanel } from "@/components/cars/checkout-insurance-panel";
import { CheckoutMessengers, messengerRequiredMessage } from "@/components/cars/checkout-messengers";
import { CheckoutRentalRequirements } from "@/components/cars/checkout-rental-requirements";
import {
  formatTripDate,
  isFreeCancellation48Extra,
  listForbiddenExtras,
  listInsuranceExtras,
  listPaidExtras,
  tripLocationLabel,
  type ReservePaidExtra,
} from "@/components/cars/reserve-checkout-helpers";
import { ExtraServiceIcon } from "@/components/cars/extra-service-icon";
import { computeTripDeliveryFees } from "@/lib/delivery/trip-fees";
import { getCheckoutCopy, type CheckoutCopy } from "@/lib/i18n/checkout-copy";

type PaidExtra = ReservePaidExtra;

type CarPayload = {
  id: string;
  title?: string;
  make?: string;
  model?: string;
  year?: number;
  seats?: number;
  doors?: number;
  transmission?: string;
  fuelType?: string;
  dailyRateEur?: unknown;
  discountPercent?: unknown;
  description?: string;
  photos?: Array<{ url: string }>;
  partnerId?: string;
  deliveryPrices?: Array<{
    deliveryLocationId?: string;
    priceEur?: unknown;
    freeAfterDays?: unknown;
    travelTimeMinutes?: unknown;
    deliveryLocation?: {
      id?: string;
      isActive?: boolean;
      airport?: { iata?: string; city?: { country?: { iso2?: string } } } | null;
    } | null;
  }>;
  extras?: Array<{
    extraServiceId?: string;
    priceEur?: unknown;
    extraService?: {
      id?: string;
      name?: unknown;
      description?: unknown;
      slug?: string;
      isTpl?: boolean;
      isActive?: boolean;
      minPriceEur?: unknown;
      maxPriceEur?: unknown;
      maxPeriodEur?: unknown;
      checkoutSlot?: unknown;
      sortOrder?: unknown;
    } | null;
  }>;
  partner?: {
    companyName?: string;
    logoUrl?: string | null;
    reviews?: Array<{ averageRating: number }>;
  };
  rentPaymentMethods?: string[];
  contractUrl?: string;
  partnerClientLanguages?: string[];
};

export function ReserveCheckout({
  carId,
  startDate: initialStart,
  endDate: initialEnd,
  pickup: initialPickup,
  dropoff: initialDropoff,
  pickupAddress: initialPickupAddress,
  dropoffAddress: initialDropoffAddress,
}: {
  carId: string;
  startDate: string;
  endDate: string;
  pickup: string;
  dropoff: string;
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { dictionary, formatPrice, locale } = usePreferences();
  const record = (value: string) => knownText(locale, value);
  const t = getCheckoutCopy(locale);

  const [startDate] = useState(initialStart);
  const [endDate] = useState(initialEnd);
  const [pickup] = useState(initialPickup || "TBS");
  const [dropoff] = useState(initialDropoff || initialPickup || "TBS");
  const [pickupAddress] = useState(initialPickupAddress);
  const [dropoffAddress] = useState(initialDropoffAddress);
  const [flightNumber, setFlightNumber] = useState("");
  const [noFlightNumber, setNoFlightNumber] = useState(false);
  const [supplierNote, setSupplierNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [agreedToContract, setAgreedToContract] = useState(false);
  const [rentalTermsOpen, setRentalTermsOpen] = useState(false);
  const [bookingTermsOpen, setBookingTermsOpen] = useState(false);
  const [bookingTermsBody, setBookingTermsBody] = useState("");
  const [bookingTermsFileUrl, setBookingTermsFileUrl] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [rememberMe] = useState(true);
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [carLoading, setCarLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment">("details");
  const [guestNoticeOpen, setGuestNoticeOpen] = useState(false);
  const [previewBookingRef, setPreviewBookingRef] = useState("");
  const previewRefRequest = useRef<Promise<string> | null>(null);

  const loadPreviewBookingRef = useCallback(() => {
    if (previewRefRequest.current) return previewRefRequest.current;
    const task = (async () => {
      try {
        const res = await fetch("/api/bookings/next-ref", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const reference =
          res.ok && typeof data.reference === "string" ? data.reference.trim() : "";
        if (reference) {
          setPreviewBookingRef(reference);
          return reference;
        }
      } catch {
        /* allow another attempt */
      }
      previewRefRequest.current = null;
      return "";
    })();
    previewRefRequest.current = task;
    return task;
  }, []);

  useEffect(() => {
    void loadPreviewBookingRef();
  }, [loadPreviewBookingRef]);

  const [car, setCar] = useState<CarPayload | null>(null);
  const [details, setDetails] = useState<CarDetailsBlob | null>(null);
  const [paidExtras, setPaidExtras] = useState<PaidExtra[]>([]);
  const [forbiddenExtras, setForbiddenExtras] = useState<PaidExtra[]>([]);
  const [insuranceExtras, setInsuranceExtras] = useState<PaidExtra[]>([]);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [fullProtection, setFullProtection] = useState(false);
  const [cancellationProtection, setCancellationProtection] = useState(false);
  const [extraDetailId, setExtraDetailId] = useState<string | null>(null);

  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneIso2, setPhoneIso2] = useState("GE");
  const [phoneNational, setPhoneNational] = useState("");
  const [messengers, setMessengers] = useState<PartnerSocialPlatform[]>([]);
  const [liveInIso2, setLiveInIso2] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [noPromoCode, setNoPromoCode] = useState(false);
  /** True when promo was auto-filled from partner link / QR (7-minute TTL). */
  const [, setPromoFromReferral] = useState(false);
  const [depositPercent, setDepositPercent] = useState(DEFAULT_DEPOSIT_PERCENT);
  const bpReferral = useBusinessPartnerReferralDiscount(promoCode, {
    disabled: noPromoCode,
  });

  // Auto-fill ONLY if this tab opened a partner link / QR (?bp= → sessionStorage).
  // Never fill from a leftover cookie when the guest opens checkout normally.
  useEffect(() => {
    if (noPromoCode) return;

    const fromReferral = readBusinessPartnerReferralCookieClient();
    if (fromReferral) {
      setPromoCode((current) => {
        if (current.trim() && current.trim().toUpperCase() !== fromReferral) {
          return current;
        }
        setPromoFromReferral(true);
        return fromReferral;
      });
    }

    const remaining = getBusinessPartnerReferralRemainingMsClient();
    if (remaining <= 0) {
      setPromoFromReferral((wasAuto) => {
        if (wasAuto) setPromoCode("");
        return false;
      });
      return;
    }

    const timer = window.setTimeout(() => {
      clearBusinessPartnerReferralCookieClient();
      setPromoFromReferral((wasAuto) => {
        if (wasAuto) setPromoCode("");
        return false;
      });
    }, remaining + 50);
    return () => window.clearTimeout(timer);
  }, [noPromoCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/legal-pages");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          terms?: { body?: string; fileUrl?: string };
        };
        const body = String(data.terms?.body || "").trim();
        const fileUrl = String(data.terms?.fileUrl || "").trim();
        if (!cancelled) {
          setBookingTermsBody(body || dictionary.common.termsBody);
          setBookingTermsFileUrl(fileUrl);
        }
      } catch {
        if (!cancelled) setBookingTermsBody(dictionary.common.termsBody);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dictionary.common.termsBody]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform/deposit");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { depositPercent?: number };
        if (typeof data.depositPercent === "number" && Number.isFinite(data.depositPercent)) {
          setDepositPercent(Math.trunc(data.depositPercent));
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCarLoading(true);
      try {
        const q = new URLSearchParams();
        if (startDate) q.set("startDate", startDate);
        if (endDate) q.set("endDate", endDate);
        const qs = q.toString();
        const carRes = await fetch(`/api/cars/${carId}${qs ? `?${qs}` : ""}`);
        if (!carRes.ok || cancelled) return;
        const payload = (await carRes.json()) as CarPayload;
        setCar(payload);
        setDetails(parseCarDetails(payload.description));
        const paid = listPaidExtras(payload);
        setPaidExtras(paid);
        setForbiddenExtras(listForbiddenExtras(payload));
        const insurance = listInsuranceExtras(payload);
        setInsuranceExtras(insurance);
        setExtraQty((prev) => {
          const next = { ...prev };
          for (const pack of [...insurance, ...paid]) {
            if (pack.locked) {
              next[pack.id] = 1;
            } else if (next[pack.id] === undefined) {
              // Free cancel-48 starts on; paid protection can turn it off.
              next[pack.id] = isFreeCancellation48Extra(pack) ? 1 : 0;
            }
          }
          return next;
        });
        const fullPack = insurance.find((pack) => pack.checkoutSlot === "full");
        if (fullPack) setFullProtection(false);
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setCarLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [carId, startDate, endDate]);

  useEffect(() => {
    const user = session?.user as
      | { name?: string | null; email?: string | null; firstName?: string; lastName?: string }
      | undefined;
    if (!user) return;
    if (user.email && !email) setEmail(user.email);
    const name = user.name?.trim() || "";
    if (name && !firstName && !lastName) {
      const parts = name.split(/\s+/);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (user.firstName && !firstName) setFirstName(user.firstName);
    if (user.lastName && !lastName) setLastName(user.lastName);
  }, [session, email, firstName, lastName]);

  const days = useMemo(() => rentalDayCount(startDate, endDate), [startDate, endDate]);
  const driverAgeYears = useMemo(
    () => ageFromDateOfBirth(dateOfBirth, startDate),
    [dateOfBirth, startDate],
  );
  const securityDepositEur = useMemo(() => {
    const n = details?.deposit != null ? Number(details.deposit) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [details]);

  const rentalTermsItems = useMemo(() => {
    const age = String(details?.minDriverAge ?? "18");
    const cat = String(details?.licenseCat || "B");
    const years = String(details?.minLicenseYears ?? "—");
    const franchise = formatFranchiseLabel(details, formatPrice);
    const deposit = formatDepositLabel(details, formatPrice);
    const methods = (car?.rentPaymentMethods || []).filter(Boolean);
    const methodsText = methods.length ? methods.join(", ") : "—";

    const mileageLimit = String(details?.mileageLimit || "").toLowerCase();
    const mileageKm = Number(details?.mileageKm);
    const mileageText =
      mileageLimit.includes("unlimit") ||
      mileageLimit === "unlimited" ||
      mileageLimit === "false" ||
      (!mileageLimit && !(Number.isFinite(mileageKm) && mileageKm > 0))
        ? t.unlimitedMileage
        : Number.isFinite(mileageKm) && mileageKm > 0
          ? `${mileageKm} km / day`
          : t.unlimitedMileage;

    return [
      { id: "driver-age", title: t.rtDriverAge, body: t.rtDriverAgeBody.replace("{n}", age) },
      {
        id: "license",
        title: t.rtLicense,
        body: t.rtLicenseBody.replace("{cat}", cat).replace("{years}", years),
      },
      { id: "insurance", title: t.rtInsurance, body: t.rtInsuranceBody },
      {
        id: "excess",
        title: t.rtExcess,
        body: t.rtExcessBody.replace("{amount}", franchise),
      },
      { id: "fees", title: t.rtFees, body: t.rtFeesBody },
      { id: "early-return", title: t.rtEarlyReturn, body: t.rtEarlyReturnBody },
      { id: "winter-tires", title: t.rtWinterTires, body: t.rtWinterTiresBody },
      { id: "fuel", title: t.rtFuel, body: t.rtFuelBody },
      {
        id: "mileage",
        title: t.rtMileage,
        body: t.rtMileageBody.replace("{text}", mileageText),
      },
      { id: "cross-border", title: t.rtCrossBorder, body: t.rtCrossBorderBody },
      { id: "ferry", title: t.rtFerry, body: t.rtFerryBody },
      {
        id: "payment",
        title: t.rtPayment,
        body: t.rtPaymentBody.replace("{methods}", methodsText),
      },
      {
        id: "deposit",
        title: t.rtDeposit,
        body: t.rtDepositBody.replace("{amount}", deposit),
      },
      { id: "delivery", title: t.rtDelivery, body: t.rtDeliveryBody },
      { id: "out-of-hours", title: t.rtOutOfHours, body: t.rtOutOfHoursBody },
      { id: "extras", title: t.rtExtras, body: t.rtExtrasBody },
    ];
  }, [car?.rentPaymentMethods, details, formatPrice, t]);
  const dailyRate = useMemo(() => {
    if (!car) return 0;
    return resolveDailyRateEur(
      details,
      toNumber(car.dailyRateEur, 0),
      toNumber(car.discountPercent, 0),
      days,
    );
  }, [car, details, days]);

  const extrasLineTotal = useMemo(() => {
    const all = [...paidExtras, ...insuranceExtras];
    const dayCount = Math.max(1, days || 1);
    return roundMoney(
      all.reduce((sum, extra) => {
        const qty = extra.locked
          ? Math.max(1, extraQty[extra.id] || 0)
          : extraQty[extra.id] || 0;
        // Daily × days, clamped by min/max. Locked mandatory stays €0; daily €0 can still have a floor.
        if (extra.free || extra.locked) return sum;
        return sum + extraPeriodCharge(extra.priceEur, dayCount, qty, extra.maxPeriodEur, extra.minPeriodEur);
      }, 0),
    );
  }, [paidExtras, insuranceExtras, extraQty, days]);

  const listedExtras = paidExtras;
  const hasFullInsuranceExtra = insuranceExtras.some((pack) => pack.checkoutSlot === "full");

  const deliveryFees = useMemo(() => {
    if (!car) return { pickupFeeEur: 0, dropoffFeeEur: 0, totalFeeEur: 0 };
    return computeTripDeliveryFees({
      rows: car.deliveryPrices,
      pickup,
      dropoff,
      rentalDays: days,
    });
  }, [car, pickup, dropoff, days]);

  const totals = useMemo(() => {
    const base = computeReserveTotals({
      dailyRateEur: dailyRate,
      days,
      extrasTotalEur: extrasLineTotal,
      fullProtection: hasFullInsuranceExtra ? false : fullProtection,
      cancellationProtection,
      depositPercent,
      franchiseEur: resolveFranchiseAmountEur(details) || undefined,
    });
    const delivery = roundMoney(deliveryFees.totalFeeEur);
    const standard = settleBookingMoney({
      rentalEur: base.rentalTotal,
      extrasEur: base.extrasTotal,
      deliveryEur: delivery,
      depositPercent,
    });
    const settled = bpReferral.active
      ? settleBusinessPartnerBookingMoney({
          rentalEur: base.rentalTotal,
          extrasEur: base.extrasTotal,
          deliveryEur: delivery,
          depositPercent,
        })
      : standard;
    const rentalShown = bpReferral.active
      ? roundMoney(base.rentalTotal * (1 - bpReferral.discountPercent / 100))
      : base.rentalTotal;
    const extrasShown = bpReferral.active
      ? roundMoney(base.extrasTotal * (1 - bpReferral.discountPercent / 100))
      : base.extrasTotal;
    const before = (bpReferral.active && "beforeDiscount" in settled
      ? settled.beforeDiscount
      : standard) as { chargedEur: number; onlineEur: number };
    return {
      ...base,
      rentalTotal: rentalShown,
      rentalTotalBefore: base.rentalTotal,
      extrasTotal: extrasShown,
      extrasTotalBefore: base.extrasTotal,
      depositPercent: settled.depositPercent,
      deliveryFeeEur: delivery,
      pickupDeliveryFeeEur: deliveryFees.pickupFeeEur,
      dropoffDeliveryFeeEur: deliveryFees.dropoffFeeEur,
      cardSurcharge: settled.cardSurchargeEur,
      cardSurchargePercent: CARD_PICKUP_SURCHARGE_PERCENT,
      subtotal: settled.tripEur,
      total: settled.chargedEur,
      totalBefore: before.chargedEur,
      payNow: settled.onlineEur,
      payNowBefore: before.onlineEur,
      payAtPickup: settled.onSiteEur,
      bpDiscountActive: bpReferral.active,
      bpDiscountPercent: bpReferral.discountPercent,
    };
  }, [
    dailyRate,
    days,
    extrasLineTotal,
    fullProtection,
    hasFullInsuranceExtra,
    cancellationProtection,
    depositPercent,
    details,
    deliveryFees,
    bpReferral.active,
    bpReferral.discountPercent,
  ]);

  const photoUrl = car?.photos?.[0]?.url || "";
  const photoUrls = (car?.photos ?? []).map((p) => p.url).filter(Boolean);
  const carTitle =
    [car?.make, car?.model].filter(Boolean).join(" ").trim() ||
    String(car?.title || "")
      .replace(/\b(19|20)\d{2}\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() ||
    t.vehicleFallback;

  const carFacts = useMemo(() => {
    const driveRaw = String(details?.drive || "").trim().toLowerCase();
    const drive = /4x4|awd|4wd/.test(driveRaw)
      ? "4x4"
      : driveRaw
        ? "2WD"
        : "";
    const color = String(details?.color || "").trim();
    const bodyTypeRaw = String(details?.bodyType || "").trim();
    const bodyType =
      bodyTypeRaw
        .replace(/^(4x4|4[\s-]?wd|awd|2wd|fwd|rwd)\s+/i, "")
        .replace(/\s+(4x4|4[\s-]?wd|awd|2wd|fwd|rwd)$/i, "")
        .trim() || bodyTypeRaw;
    const mileageLimit = String(details?.mileageLimit || "").toLowerCase();
    const mileageKm = Number(details?.mileageKm);
    const mileage =
      mileageLimit.includes("unlimit") || mileageLimit === "unlimited"
        ? t.unlimitedMileage
        : Number.isFinite(mileageKm) && mileageKm > 0
          ? `${mileageKm} km`
          : "";
    const engineVolume = String(details?.engineVolume || "").trim();
    const consumptionRaw = String(details?.consumption || "").trim();
    const consumption = consumptionRaw
      .replace(/\s*(l\/100\s*km|ლ\/100\s*კმ|л\/100\s*км)\s*/gi, "")
      .trim();
    const luggageRaw = String(details?.luggage || details?.luggageSize || "").toLowerCase();
    const luggage = /large|დიდ/.test(luggageRaw)
      ? t.luggageLarge
      : /small|მცირ/.test(luggageRaw)
        ? t.luggageSmall
        : /medium|საშუალ/.test(luggageRaw)
          ? t.luggageMedium
          : luggageRaw
            ? String(details?.luggage || details?.luggageSize || "").trim()
            : "";

    const rows: Array<{
      label: string;
      value: string;
      compact?: boolean;
      kind?: "fuel";
    }> = [];
    if (car?.year) rows.push({ label: t.yearLabel, value: String(car.year) });
    if (color) rows.push({ label: t.colorLabel, value: color });
    if (drive) rows.push({ label: t.driveLabel, value: drive });
    if (bodyType) rows.push({ label: t.bodyTypeLabel, value: bodyType });
    if (engineVolume) rows.push({ label: t.engineVolumeLabel, value: engineVolume });
    if (consumption) {
      rows.push({
        label: t.fuelConsumptionLabel,
        value: `${consumption} L/100km`,
        kind: "fuel",
      });
    }
    if (mileage) rows.push({ label: t.mileageLabel, value: mileage });
    if (luggage) rows.push({ label: t.luggageLabel, value: luggage });
    return rows;
  }, [car, details, t]);

  const featureChips = useMemo(() => {
    const music = Array.isArray(details?.music) ? details.music.map(String) : [];
    const acRaw = String(details?.ac ?? "Air Conditioning").trim().toLowerCase();
    const hasAc = Boolean(acRaw) && acRaw !== "none";
    return [
      { id: "ac", label: t.ac, enabled: hasAc },
      { id: "rear-camera", label: t.rearCamera, enabled: Boolean(details?.rearCam) },
      {
        id: "carplay",
        label: "CarPlay",
        enabled: music.some((m) => /carplay|android\s*auto/i.test(m)),
      },
      {
        id: "bluetooth",
        label: "Bluetooth",
        enabled: music.some((m) => /bluetooth/i.test(m)),
      },
    ] as const;
  }, [details, t]);

  const benefitBadges = useMemo(() => {
    const rawLimit = details?.mileageLimit;
    const mileageLimitStr = String(rawLimit ?? "").toLowerCase();
    const mileageKmNum = Number(details?.mileageKm);
    const hasKmCap = Number.isFinite(mileageKmNum) && mileageKmNum > 0;
    const hasUnlimitedMileage =
      mileageLimitStr.includes("unlimit") ||
      mileageLimitStr === "unlimited" ||
      (rawLimit !== true &&
        rawLimit !== 1 &&
        mileageLimitStr !== "true" &&
        !hasKmCap);

    return [
      {
        id: "support-24",
        label: t.support24Badge,
        icon: <Headset className="h-3.5 w-3.5" />,
        className: "bg-rose-100 text-slate-700",
        enabled: true,
      },
      {
        id: "unlimited-mileage",
        label: t.unlimitedMileageBadge,
        icon: <Gauge className="h-3.5 w-3.5" />,
        className: "bg-emerald-100 text-slate-700",
        enabled: hasUnlimitedMileage,
      },
      {
        id: "free-cancel",
        label: t.freeCancelBadge,
        icon: <Shield className="h-3.5 w-3.5" />,
        className: "bg-sky-100 text-slate-700",
        enabled: true,
      },
      {
        id: "instant-booking",
        label: t.instantBookingBadge,
        icon: <Zap className="h-3.5 w-3.5" />,
        className: "bg-amber-100 text-slate-700",
        enabled: true,
      },
    ] as const;
  }, [details, t]);

  const backHref = useMemo(() => {
    const q = new URLSearchParams();
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", endDate);
    if (pickup) q.set("pickup", pickup);
    if (dropoff) q.set("dropoff", dropoff);
    if (pickupAddress) q.set("pickupAddress", pickupAddress);
    if (dropoffAddress) q.set("dropoffAddress", dropoffAddress);
    const s = q.toString();
    return s ? `/cars?${s}` : "/cars";
  }, [startDate, endDate, pickup, dropoff, pickupAddress, dropoffAddress]);

  const setQty = (id: string, qty: number) => {
    const extra = [...paidExtras, ...insuranceExtras].find((row) => row.id === id);
    if (extra?.locked) {
      setExtraQty((prev) => ({ ...prev, [id]: 1 }));
      return;
    }
    const nextQty = Math.max(0, Math.min(5, qty));
    const enablingFreeCancel =
      nextQty > 0 && Boolean(extra && isFreeCancellation48Extra(extra));

    setExtraQty((prev) => {
      const updated = { ...prev, [id]: nextQty };
      // Basic ↔ Full insurance: both may be off; turning one on turns the other off.
      if (
        nextQty > 0 &&
        (extra?.checkoutSlot === "basic" || extra?.checkoutSlot === "full")
      ) {
        for (const pack of insuranceExtras) {
          if (pack.id === id) continue;
          if (pack.locked) continue;
          if (pack.checkoutSlot === "basic" || pack.checkoutSlot === "full") {
            updated[pack.id] = 0;
          }
        }
      }
      return updated;
    });

    // Free cancellation 48 ↔ paid cancellation protection: only one at a time.
    if (enablingFreeCancel) {
      setCancellationProtection(false);
    }
  };

  const setCancellationProtectionExclusive = (next: boolean) => {
    if (next) {
      setCancellationProtection(true);
      setExtraQty((prev) => {
        const updated = { ...prev };
        for (const extra of [...paidExtras, ...insuranceExtras]) {
          if (isFreeCancellation48Extra(extra) && !extra.locked) {
            updated[extra.id] = 0;
          }
        }
        return updated;
      });
      return;
    }
    setCancellationProtection(false);
  };

  const inputClass = (key: string) =>
    cn(
      "mt-1 w-full rounded-md border p-2.5 outline-none transition",
      invalidFields.has(key)
        ? "border-2 border-red-500 bg-red-50 text-slate-900 ring-2 ring-red-200 focus:border-red-600 focus:ring-red-200"
        : "border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
    );

  const clearFieldError = (key: string) => {
    setInvalidFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const fieldHint = (key: string, text: string) =>
    invalidFields.has(key) ? (
      <span className="mt-1 block text-xs font-semibold text-red-600">{text}</span>
    ) : null;

  const goToPaymentStep = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const invalid = new Set<string>();
    const messages: string[] = [];
    if (!agreedToContract) {
      invalid.add("terms");
      messages.push(dictionary.booking.termsRequired);
    }
    if (!pickup.trim()) invalid.add("pickup");
    if (!dropoff.trim()) invalid.add("dropoff");
    if (!startDate) invalid.add("startDate");
    if (!endDate) invalid.add("endDate");
    if (!firstName.trim()) invalid.add("firstName");
    if (!lastName.trim()) invalid.add("lastName");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) invalid.add("email");
    if (phoneNational.replace(/\D/g, "").length < 6) invalid.add("phone");
    if (!messengers.length) {
      invalid.add("messengers");
      messages.push(messengerRequiredMessage(locale));
    }
    if (!dateOfBirth.trim()) {
      invalid.add("dateOfBirth");
    } else {
      const age = ageFromDateOfBirth(dateOfBirth, startDate);
      const minAge = Number(details?.minDriverAge ?? 18);
      if (age == null || !Number.isFinite(age) || age < 0) {
        invalid.add("dateOfBirth");
      } else if (Number.isFinite(minAge) && age < minAge) {
        invalid.add("dateOfBirth");
        messages.push(
          dictionary.booking.driverAgeTooYoung.replace("{n}", String(minAge)),
        );
      }
    }
    if (!liveInIso2.trim()) invalid.add("liveIn");
    if (!noFlightNumber && !flightNumber.trim()) {
      invalid.add("flightNumber");
      messages.push(dictionary.booking.flightRequired);
    }
    if (invalid.has("firstName") || invalid.has("lastName") || invalid.has("email")) {
      messages.push(dictionary.booking.driverRequired);
    }
    if (invalid.has("phone")) messages.push(dictionary.booking.phoneRequired);
    if (invalid.has("dateOfBirth") && !messages.some((m) => /age|ასაკ|возраст|Jahre|ans|lat|سنة/i.test(m))) {
      messages.push(dictionary.booking.birthDateRequired);
    }
    if (invalid.size > 0) {
      setInvalidFields(invalid);
      setCheckoutStep("details");
      setError(
        messages.filter(Boolean).slice(0, 2).join(" ") || dictionary.booking.fixHighlighted,
      );
      requestAnimationFrame(() => {
        document
          .querySelector("[data-invalid-field='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setInvalidFields(new Set());
    setError("");
    let reference = previewBookingRef.trim();
    if (!reference) {
      setLoading(true);
      reference = (await loadPreviewBookingRef()).trim();
      setLoading(false);
    }
    if (!reference) {
      setError(dictionary.booking.createFailed);
      return;
    }
    setPreviewBookingRef(reference);
    setGuestNoticeOpen(true);
  };

  const proceedToPaymentAfterNotice = () => {
    setGuestNoticeOpen(false);
    setCheckoutStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBooking = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const invalid = new Set<string>();
    const messages: string[] = [];

    if (!agreedToContract) {
      invalid.add("terms");
      messages.push(dictionary.booking.termsRequired);
    }
    if (!pickup.trim()) {
      invalid.add("pickup");
    }
    if (!dropoff.trim()) {
      invalid.add("dropoff");
    }
    if (!startDate) {
      invalid.add("startDate");
    }
    if (!endDate) {
      invalid.add("endDate");
    }
    if (!firstName.trim()) invalid.add("firstName");
    if (!lastName.trim()) invalid.add("lastName");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      invalid.add("email");
    }
    const phoneDigits = phoneNational.replace(/\D/g, "");
    if (phoneDigits.length < 6) invalid.add("phone");
    if (!messengers.length) {
      invalid.add("messengers");
      messages.push(messengerRequiredMessage(locale));
    }
    if (!dateOfBirth.trim()) {
      invalid.add("dateOfBirth");
    } else {
      const age = ageFromDateOfBirth(dateOfBirth, startDate);
      const minAge = Number(details?.minDriverAge ?? 18);
      if (age == null || (Number.isFinite(minAge) && age < minAge)) {
        invalid.add("dateOfBirth");
      }
    }
    if (!liveInIso2.trim()) invalid.add("liveIn");
    if (!noFlightNumber && !flightNumber.trim()) {
      invalid.add("flightNumber");
      messages.push(dictionary.booking.flightRequired);
    }

    if (invalid.has("firstName") || invalid.has("lastName") || invalid.has("email")) {
      messages.push(dictionary.booking.driverRequired);
    }
    if (invalid.has("phone")) {
      messages.push(dictionary.booking.phoneRequired);
    }

    if (invalid.size > 0) {
      setInvalidFields(invalid);
      setCheckoutStep("details");
      setError(
        messages.filter(Boolean).slice(0, 2).join(" ") || dictionary.booking.fixHighlighted,
      );
      requestAnimationFrame(() => {
        const el = document.querySelector("[data-invalid-field='true']");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setInvalidFields(new Set());
    setError("");
    setLoading(true);
    try {
      const selectedExtras = [...paidExtras, ...insuranceExtras]
        .map((extra) => ({
          id: extra.id,
          qty: extra.locked ? Math.max(1, extraQty[extra.id] || 0) : extraQty[extra.id] || 0,
        }))
        .filter((row) => row.qty > 0);
      const phone = formatInternationalPhone(phoneIso2, phoneNational);
      const res = await fetch("/api/bookings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          startDate,
          endDate,
          flightNumber: noFlightNumber ? "" : flightNumber.trim(),
          pickupAirportIata: pickup,
          dropoffAirportIata: dropoff,
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim(),
          extras: selectedExtras,
          fullProtection: hasFullInsuranceExtra ? false : fullProtection,
          cancellationProtection,
          pickupPaymentMethod: "card",
          guestTitle: title,
          guestFirstName: firstName.trim(),
          guestLastName: lastName.trim(),
          guestEmail: email.trim(),
          guestPhone: phone,
          messengers,
          supplierNote: showNote ? supplierNote.trim() : "",
          marketingOptIn,
          rememberMe,
          dateOfBirth: dateOfBirth.trim(),
          countryOfResidence: liveInIso2.trim().toUpperCase(),
          promoCode: noPromoCode
            ? ""
            : (
                bpReferral.activeCode ||
                promoCode.trim() ||
                readBusinessPartnerReferralCookieClient()
              ).toUpperCase(),
          declinePartnerReferral: noPromoCode,
          paymentProvider: "paypal",
          paymentMode: "sandbox",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const apiError = String(data.error || dictionary.booking.createFailed);
        const apiInvalid = new Set<string>();
        const lower = apiError.toLowerCase();
        if (/log in or register|ავტორიზაცია|регистр/i.test(lower)) {
          throw new Error(dictionary.booking.createFailed);
        }
        if (/invalid `prisma|econnrefused|database is temporarily|can't reach database/.test(lower)) {
          throw new Error(dictionary.booking.createFailed);
        }
        if (lower.includes("flight")) apiInvalid.add("flightNumber");
        if (lower.includes("pick-up address") || lower.includes("pickup address")) {
          apiInvalid.add("pickupAddress");
        }
        if (lower.includes("drop-off address") || lower.includes("dropoff address")) {
          apiInvalid.add("dropoffAddress");
        }
        if (lower.includes("driver") || lower.includes("information")) {
          apiInvalid.add("firstName");
          apiInvalid.add("lastName");
          apiInvalid.add("email");
        }
        if (lower.includes("phone")) apiInvalid.add("phone");
        if (lower.includes("messenger")) apiInvalid.add("messengers");
        if (lower.includes("date")) {
          apiInvalid.add("startDate");
          apiInvalid.add("endDate");
        }
        if (lower.includes("airport") || lower.includes("unknown")) {
          apiInvalid.add("pickup");
          apiInvalid.add("dropoff");
        }
        setInvalidFields(apiInvalid);
        setCheckoutStep("details");
        throw new Error(apiError);
      }
      const ref =
        data.sequentialNumber != null
          ? formatBookingRef(data.sequentialNumber) || ""
          : data.id
            ? String(data.id).slice(0, 8)
            : "";
      clearBusinessPartnerReferralCookieClient();
      const q = new URLSearchParams();
      q.set("booked", "1");
      if (ref) q.set("ref", ref);
      if (email.trim()) q.set("email", email.trim());
      router.push(`/?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : dictionary.booking.createFailed);
      requestAnimationFrame(() => {
        const el = document.querySelector("[data-invalid-field='true']");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2f6]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 p-2 sm:flex-row sm:gap-2.5 sm:p-2.5">
          <Step label={t.step1} href={backHref} />
          <Step
            label={t.step2}
            active={checkoutStep === "details"}
            onClick={checkoutStep === "payment" ? () => setCheckoutStep("details") : undefined}
          />
          <Step label={t.step3} active={checkoutStep === "payment"} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center text-sm font-semibold text-[#1d6fe8] hover:underline"
        >
          {t.backToSearch}
        </Link>

        {carLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            {t.loadingVehicle}
          </div>
        ) : checkoutStep === "payment" ? (
          <div className="mx-auto max-w-lg space-y-4">
            {error ? (
              <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>
            ) : null}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-sm font-extrabold text-[#0b1f4b]">{t.step3}</p>
              <p className="mt-1 text-xs text-slate-500">
                {tripLocationLabel(pickup, pickupAddress, { airportSuffix: t.airportSuffix })}
              </p>
            </div>
            <CheckoutPaypalSandbox
              amountLabel={formatPrice(totals.payNow)}
              locale={locale}
              guestEmail={email}
              loading={loading}
              onBack={() => setCheckoutStep("details")}
              onConfirm={async () => {
                await handleBooking();
              }}
            />
          </div>
        ) : (
          <form
            noValidate
            onSubmit={goToPaymentStep}
            className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="space-y-4">
              {/* Car summary */}
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-4">
                  <div className="w-full max-w-full shrink-0 sm:w-auto sm:max-w-md">
                    <CheckoutCarGallery
                      photos={photoUrls.length ? photoUrls : photoUrl ? [photoUrl] : []}
                      title={carTitle}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h1 className="text-lg font-bold text-[#0b1f4b] sm:text-xl">
                      {carTitle}
                      <Info className="ms-1 inline h-4 w-4 text-slate-400" aria-hidden />
                    </h1>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      <Spec icon={<Users className="h-3.5 w-3.5" />} label={t.seats(car?.seats ?? 5)} />
                      <Spec icon={<CarIcon className="h-3.5 w-3.5" />} label={t.doors(car?.doors ?? 4)} />
                      <Spec
                        icon={<Fuel className="h-3.5 w-3.5" />}
                        label={(car?.fuelType || "PETROL").replace(/_/g, " ")}
                      />
                      <Spec
                        icon={<CarIcon className="h-3.5 w-3.5" />}
                        label={(car?.transmission || "AUTOMATIC").replace(/_/g, " ")}
                      />
                    </div>

                    {carFacts.length > 0 ? (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                          {carFacts.map((fact) =>
                            fact.kind === "fuel" ? (
                              <div
                                key={`${fact.label}-${fact.value}`}
                                className="flex items-baseline justify-between gap-3 text-xs"
                              >
                                <dt className="font-medium text-slate-500">{fact.label}:</dt>
                                <dd className="shrink-0 text-end font-semibold text-[#0b1f4b]">
                                  {fact.value}
                                </dd>
                              </div>
                            ) : (
                              <div
                                key={`${fact.label}-${fact.value}`}
                                className={cn(
                                  "flex items-baseline justify-between gap-3",
                                  fact.compact ? "text-[10px] leading-snug" : "text-xs",
                                )}
                              >
                                <dt className={cn("font-medium text-slate-500", fact.compact && "max-w-[9rem]")}>
                                  {fact.label}
                                </dt>
                                <dd className="shrink-0 text-end font-semibold text-[#0b1f4b]">{fact.value}</dd>
                              </div>
                            ),
                          )}
                        </dl>
                      </div>
                    ) : null}

                    <ul className="mt-[max(0px,calc(0.75rem+0.5cm-1cm+0.5cm))] grid grid-cols-2 gap-x-1 gap-y-2">
                      {featureChips.map((feature) => (
                        <li
                          key={feature.id}
                          className={cn(
                            "flex min-h-[1.5rem] w-full items-center justify-center rounded-md border px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight",
                            feature.enabled
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : "border-amber-400 bg-amber-50 text-amber-800 line-through decoration-amber-700",
                          )}
                        >
                          <span className="truncate">
                            {feature.label}
                            {feature.enabled ? " ✓" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-auto w-full rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-center text-[10px] font-semibold leading-tight text-emerald-800 sm:text-xs">
                      {t.freeCancellation}
                    </p>
                  </div>
                </div>

                <ul className="mt-1.5 grid w-full grid-cols-4 gap-1.5">
                  {benefitBadges.map((badge) => (
                    <li
                      key={badge.id}
                      className={cn(
                        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-center text-[10px] font-semibold leading-tight sm:px-3 sm:text-[11px]",
                        badge.enabled
                          ? badge.className
                          : "border border-amber-400 bg-amber-50 text-amber-800 line-through decoration-amber-700",
                      )}
                    >
                      <span className={cn("shrink-0", badge.enabled ? "opacity-70" : "opacity-50")}>
                        {badge.icon}
                      </span>
                      <span className="truncate">{badge.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <CheckoutRentalRequirements
                copy={t}
                minDriverAge={Number(details?.minDriverAge ?? 18)}
                minLicenseYears={Number(details?.minLicenseYears ?? 0)}
                termsItems={rentalTermsItems}
                partnerLanguages={car?.partnerClientLanguages}
              />

              <CheckoutInsurancePanel
                copy={t}
                formatPrice={formatPrice}
                packs={insuranceExtras}
                selectedIds={
                  new Set(
                    insuranceExtras
                      .filter((pack) => (extraQty[pack.id] || 0) > 0)
                      .map((pack) => pack.id),
                  )
                }
                onTogglePack={(extraId, next) => setQty(extraId, next ? 1 : 0)}
                freeLabel={dictionary.common.free}
                perDayLabel={t.perDay}
                days={days}
              />

              {/* Additional services */}
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-base font-bold text-[#0b1f4b]">{t.chooseExtras}</h2>
                <p className="mt-1 mb-4 text-sm text-slate-600">{t.extrasDescription}</p>
                {listedExtras.length === 0 && forbiddenExtras.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.noExtras}</p>
                ) : (
                  <div className="space-y-2">
                    <ul className="flex flex-col gap-1.5">
                      {listedExtras.map((extra) => {
                        const locked = Boolean(extra.locked);
                        const qty = locked ? 1 : extraQty[extra.id] || 0;
                        const selected = locked || qty > 0;
                        const dayCount = Math.max(1, days || 1);
                        const units = Math.max(qty, 1);
                        const line = roundMoney(
                          extra.free || locked
                            ? 0
                            : extraPeriodCharge(extra.priceEur, dayCount, units, extra.maxPeriodEur, extra.minPeriodEur),
                        );
                        const isFree = Boolean(extra.free || locked || line <= 0);
                        return (
                          <li
                            key={extra.id}
                            className={cn(
                              "flex flex-nowrap items-center gap-2 rounded-lg border px-2 py-1.5 sm:gap-2.5",
                              locked || selected
                                ? "border-emerald-200 bg-emerald-50/70 ring-1 ring-emerald-100"
                                : "border-amber-200 bg-amber-50/60 ring-1 ring-amber-100",
                            )}
                          >
                            <ExtraServiceIcon
                              name={extra.name}
                              slug={extra.slug}
                              description={extra.description}
                              compact
                            />
                            <div className="flex min-w-0 flex-1 items-center gap-1">
                              <span
                                className={cn(
                                  "min-w-0 truncate text-sm font-extrabold leading-none",
                                  locked || selected ? "text-[#0b1f4b]" : "text-amber-950",
                                )}
                              >
                                {record(extra.name)}
                              </span>
                              {extra.description?.trim() ? (
                                <ExtraDetailHint
                                  open={extraDetailId === extra.id}
                                  onOpenChange={(next) =>
                                    setExtraDetailId(next ? extra.id : null)
                                  }
                                  title={record(extra.name)}
                                  body={record(extra.description.trim())}
                                  label={t.detailsLink}
                                />
                              ) : null}
                            </div>

                            {selected && !locked && !isFree ? (
                              <div className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-md border border-[#60d1a6]/80 bg-white/80">
                                <button
                                  type="button"
                                  aria-label={t.quantity}
                                  className="flex h-6 w-6 items-center justify-center text-slate-700 hover:bg-white"
                                  onClick={() => setQty(extra.id, qty - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-4 text-center text-[11px] font-semibold text-slate-900">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center text-slate-700 hover:bg-white"
                                  onClick={() => setQty(extra.id, qty + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : null}

                            <div className="flex shrink-0 flex-nowrap items-center gap-x-1.5 whitespace-nowrap text-end sm:gap-x-2">
                              {isFree ? (
                                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-[#0a7a52]">
                                  {dictionary.common.free}
                                </span>
                              ) : (
                                <>
                                  <span
                                    className={cn(
                                      "text-sm font-extrabold leading-none",
                                      selected ? "text-[#0a7a52]" : "text-amber-800",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "me-1 text-[11px] font-semibold",
                                        selected ? "text-slate-500" : "text-amber-700/85",
                                      )}
                                    >
                                      {t.price}
                                    </span>
                                    {`${formatPrice(extra.priceEur)}${t.perDay}`}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-xs font-bold leading-none sm:text-[13px]",
                                      selected ? "text-slate-600" : "text-amber-800/90",
                                    )}
                                  >
                                    {`x ${dayCount}`}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-sm font-extrabold leading-none",
                                      selected ? "text-[#06281f]" : "text-amber-950",
                                    )}
                                  >
                                    {formatPrice(line)}
                                  </span>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={selected}
                              aria-label={extra.name}
                              disabled={locked}
                              onClick={() => {
                                if (locked) return;
                                setQty(extra.id, selected ? 0 : 1);
                              }}
                              className={cn(
                                "relative h-5 w-9 shrink-0 rounded-full transition",
                                selected ? "bg-[#00865a]" : "bg-amber-400",
                                locked && "cursor-not-allowed opacity-90",
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                                  selected ? "start-4" : "start-0.5",
                                )}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {forbiddenExtras.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {forbiddenExtras.map((extra) => (
                          <li
                            key={extra.id}
                            className="flex items-center gap-2 rounded-lg border border-red-400 bg-red-50 px-2 py-1.5 ring-1 ring-red-200"
                          >
                            <ExtraServiceIcon
                              name={extra.name}
                              slug={extra.slug}
                              description={extra.description}
                              variant="forbidden"
                              compact
                            />
                            <div className="flex min-w-0 flex-1 items-center gap-1 truncate">
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {record(extra.name)}
                              </span>
                              {extra.description?.trim() ? (
                                <ExtraDetailHint
                                  open={extraDetailId === extra.id}
                                  onOpenChange={(next) =>
                                    setExtraDetailId(next ? extra.id : null)
                                  }
                                  title={record(extra.name)}
                                  body={record(extra.description.trim())}
                                  label={t.detailsLink}
                                />
                              ) : null}
                              <span className="ms-1 shrink-0 text-xs font-bold text-red-700">
                                {t.serviceForbidden}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </section>

              {/* Cancellation protection */}
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-[#0b1f4b]">{t.cancellationTitle}</h2>
                </div>
                <p className="mb-3 text-sm text-slate-600">{t.cancellationBody}</p>
                <p className="mb-2 text-sm font-semibold text-slate-800">{t.whyCancellation}</p>
                <ul className="mb-4 space-y-1.5 text-sm text-slate-700">
                  {t.cancellationBenefits.map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-emerald-700">
                      {`${formatPrice(totals.cancellationDaily)}${t.perDay}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.totalCost(
                        formatPrice(roundMoney(totals.cancellationDaily * totals.days)),
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCancellationProtectionExclusive(!cancellationProtection)}
                    className={cn(
                      "rounded-md px-4 py-2.5 text-sm font-bold text-white transition",
                      cancellationProtection ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700",
                    )}
                  >
                    {cancellationProtection ? t.remove : t.addToRental}
                  </button>
                </div>
              </section>

              {/* Driver info */}
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-100 px-4 py-3 text-sm font-bold text-[#0b1f4b]">
                  {t.driverInfo}
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-[120px_1fr_1fr]">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t.titleLabel}
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 p-2.5"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      >
                        <option value="Mr">{t.titleMr}</option>
                        <option value="Mrs">{t.titleMrs}</option>
                        <option value="Ms">{t.titleMs}</option>
                        <option value="Mx">{t.titleMx}</option>
                      </select>
                    </label>
                    <label
                      className="block text-sm font-semibold text-slate-700"
                      data-invalid-field={invalidFields.has("firstName") ? "true" : undefined}
                    >
                      {t.firstName}
                      <input
                        className={inputClass("firstName")}
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          clearFieldError("firstName");
                        }}
                        aria-required
                      />
                      {fieldHint("firstName", dictionary.booking.driverRequired)}
                    </label>
                    <label
                      className="block text-sm font-semibold text-slate-700"
                      data-invalid-field={invalidFields.has("lastName") ? "true" : undefined}
                    >
                      {t.lastName}
                      <input
                        className={inputClass("lastName")}
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          clearFieldError("lastName");
                        }}
                        aria-required
                      />
                      {fieldHint("lastName", dictionary.booking.driverRequired)}
                    </label>
                  </div>

                  <label
                    className="block text-sm font-semibold text-slate-700"
                    data-invalid-field={invalidFields.has("email") ? "true" : undefined}
                  >
                    {t.email}
                    <input
                      type="email"
                      className={inputClass("email")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      aria-required
                    />
                    {fieldHint("email", dictionary.booking.driverRequired)}
                  </label>

                  <div data-invalid-field={invalidFields.has("phone") ? "true" : undefined}>
                    <PhoneCountryField
                      label={t.phone}
                      iso2={phoneIso2}
                      national={phoneNational}
                      required
                      invalid={invalidFields.has("phone")}
                      onIso2Change={setPhoneIso2}
                      onNationalChange={(v) => {
                        setPhoneNational(v);
                        clearFieldError("phone");
                      }}
                    />
                    {fieldHint("phone", dictionary.booking.phoneRequired)}
                  </div>

                  <CheckoutMessengers
                    locale={locale}
                    selected={messengers}
                    invalid={invalidFields.has("messengers")}
                    onChange={(next) => {
                      setMessengers(next);
                      clearFieldError("messengers");
                    }}
                  />

                  <div
                    className="block text-sm font-semibold text-slate-700"
                    data-invalid-field={invalidFields.has("dateOfBirth") ? "true" : undefined}
                  >
                    {dictionary.booking.birthDate}
                    <BirthDateSelect
                      value={dateOfBirth}
                      locale={locale}
                      invalid={invalidFields.has("dateOfBirth")}
                      onChange={(iso) => {
                        setDateOfBirth(iso);
                        clearFieldError("dateOfBirth");
                      }}
                    />
                    {fieldHint("dateOfBirth", dictionary.booking.birthDateRequired)}
                    {driverAgeYears != null ? (
                      <span className="mt-1.5 block text-sm font-semibold text-[#0b1f4b]">
                        {t.driverAgeYears.replace("{n}", String(driverAgeYears))}
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "rounded-md px-1 py-1",
                      invalidFields.has("liveIn") && "bg-red-50 ring-2 ring-red-200",
                    )}
                    data-invalid-field={invalidFields.has("liveIn") ? "true" : undefined}
                  >
                    <ResidenceCountrySelect
                      label={t.iLiveIn}
                      locale={locale}
                      valueIso2={liveInIso2}
                      invalid={invalidFields.has("liveIn")}
                      onChange={(iso2) => {
                        setLiveInIso2(iso2);
                        clearFieldError("liveIn");
                      }}
                    />
                    {fieldHint("liveIn", t.countryOfResidencePrompt)}
                  </div>

                  {/* Compact upsells */}
                  {!hasFullInsuranceExtra ? (
                    <div className="space-y-2">
                      <UpsellRow
                        title={t.upsellProtectionTitle}
                        body={t.upsellProtectionBody}
                        value={fullProtection}
                        onChange={setFullProtection}
                        purchaseQuestion={t.purchaseQuestion}
                        yesLabel={t.yes}
                        noLabel={t.no}
                      />
                    </div>
                  ) : null}

                  {!showNote ? (
                    <button
                      type="button"
                      onClick={() => setShowNote(true)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#1d6fe8]"
                    >
                      <Plus className="h-4 w-4" /> {t.addNote}
                    </button>
                  ) : (
                    <label className="block text-sm font-semibold text-slate-700">
                      {t.noteForSupplier}
                      <textarea
                        className="mt-1 w-full rounded-md border border-slate-300 p-2.5"
                        rows={3}
                        value={supplierNote}
                        onChange={(e) => setSupplierNote(e.target.value)}
                      />
                    </label>
                  )}

                  <div
                    className={cn(
                      "rounded-md border p-2.5",
                      invalidFields.has("flightNumber")
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-slate-50/80",
                    )}
                    data-invalid-field={invalidFields.has("flightNumber") ? "true" : undefined}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-700">
                        {dictionary.booking.flightNumber}
                      </p>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={noFlightNumber}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNoFlightNumber(checked);
                            if (checked) {
                              setFlightNumber("");
                              clearFieldError("flightNumber");
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#1d6fe8] focus:ring-[#1d6fe8]"
                        />
                        {t.noFlightNumber}
                      </label>
                    </div>
                    <input
                      className={cn(
                        inputClass("flightNumber"),
                        noFlightNumber && "cursor-not-allowed bg-slate-100 text-slate-400",
                      )}
                      value={flightNumber}
                      disabled={noFlightNumber}
                      onChange={(e) => {
                        setFlightNumber(e.target.value);
                        if (e.target.value.trim()) setNoFlightNumber(false);
                        clearFieldError("flightNumber");
                      }}
                      aria-required={!noFlightNumber}
                    />
                    {invalidFields.has("flightNumber") ? (
                      <span className="mt-1 block text-xs font-semibold text-red-600">
                        {dictionary.booking.flightRequired}
                      </span>
                    ) : (
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        {t.flightHint}
                      </span>
                    )}
                  </div>

                  <div className="flex items-stretch gap-2">
                    <div className="relative min-w-0 flex-1">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          const next = e.target.value;
                          setPromoCode(next);
                          setPromoFromReferral(false);
                          if (next.trim()) setNoPromoCode(false);
                        }}
                        onBlur={() => {
                          const next = promoCode.trim().toUpperCase();
                          if (next !== promoCode) setPromoCode(next);
                        }}
                        placeholder={dictionary.booking.promoCodeOptional}
                        disabled={noPromoCode}
                        className={cn(
                          "w-full rounded-md border border-slate-300 py-2.5 pe-20 ps-3 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
                          noPromoCode && "cursor-not-allowed bg-slate-100 text-slate-400",
                        )}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        disabled={noPromoCode}
                        onClick={() => {
                          const next = promoCode.trim().toUpperCase();
                          if (!next) return;
                          setPromoCode(next);
                        }}
                        className={cn(
                          "absolute end-2 top-1/2 -translate-y-1/2 text-sm font-semibold",
                          noPromoCode
                            ? "text-slate-300"
                            : promoCode.trim()
                              ? bpReferral.active
                                ? "text-emerald-600"
                                : bpReferral.checking
                                  ? "text-slate-400"
                                  : "text-[#1d6fe8] hover:underline"
                              : "text-slate-400",
                        )}
                      >
                        {bpReferral.active ? "✓" : dictionary.booking.promoApply}
                      </button>
                    </div>
                    <label
                      className={cn(
                        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600",
                        noPromoCode && "border-sky-300 bg-sky-50 text-sky-800",
                      )}
                    >
                      <span>{t.noPromoCode}</span>
                      <input
                        type="checkbox"
                        checked={noPromoCode}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNoPromoCode(checked);
                          if (checked) {
                            setPromoCode("");
                            setPromoFromReferral(false);
                            clearBusinessPartnerReferralCookieClient();
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#1d6fe8] focus:ring-[#1d6fe8]"
                      />
                    </label>
                  </div>
                  {noPromoCode ? null : totals.bpDiscountActive ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      −{totals.bpDiscountPercent}%{" "}
                      {locale === "ka"
                        ? "პარტნიორის კოდი — ფასდაკლება მანქანასა და სერვისებზე. მიწოდება/დაბრუნება და ბარათის +3% სრულ ფასად რჩება; „გადაიხადეთ ახლა“ მცირდება, ადგილზე გადახდა უცვლელია."
                        : "Partner code — discount on car & services only. Delivery/return and card +3% stay full price; pay-now is reduced, pay-on-site unchanged."}
                    </p>
                  ) : promoCode.trim() && !bpReferral.checking ? (
                    <p className="text-xs font-semibold text-slate-500">
                      {locale === "ka"
                        ? "შეიყვანეთ სრული პრომო კოდი ფასდაკლებისთვის."
                        : "Enter the full promo code to apply the discount."}
                    </p>
                  ) : null}

                  <label
                    className={cn(
                      "flex items-start gap-2 rounded-md p-2 text-sm text-slate-700",
                      invalidFields.has("terms") && "bg-red-50 ring-2 ring-red-200",
                    )}
                    data-invalid-field={invalidFields.has("terms") ? "true" : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={agreedToContract}
                      onChange={(e) => {
                        setAgreedToContract(e.target.checked);
                        clearFieldError("terms");
                      }}
                      className="mt-1 h-4 w-4"
                      aria-required
                    />
                    <span>
                      {t.agreePrefix}
                      <button
                        type="button"
                        className="font-semibold text-sky-600 underline decoration-sky-600/80 underline-offset-2 hover:text-sky-800"
                        onClick={(e: MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRentalTermsOpen(true);
                        }}
                      >
                        {t.agreeRentalTermsLink}
                      </button>
                      {t.agreeBetweenLinks}
                      <button
                        type="button"
                        className="font-semibold text-sky-600 underline decoration-sky-600/80 underline-offset-2 hover:text-sky-800"
                        onClick={(e: MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBookingTermsOpen(true);
                        }}
                      >
                        {t.agreeBookingTermsLink}
                      </button>
                      {t.agreeSuffix}
                    </span>
                  </label>

                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>{t.marketingOptIn}</span>
                  </label>

                  {error ? (
                    <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
                      <p>{error}</p>
                      {invalidFields.size > 0 ? (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {dictionary.booking.fixHighlighted}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    id="checkout-pay-now"
                    className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4"
                  >
                    <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Lock className="h-4 w-4 text-emerald-600" />
                      {t.secureTransaction}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="space-y-1.5 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.pickup}</p>
                    <p className="font-semibold text-[#0b1f4b]">
                      {tripLocationLabel(pickup, pickupAddress, { airportSuffix: t.airportSuffix })}
                    </p>
                    <p className="text-slate-600">{formatTripDate(startDate, locale)}</p>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.dropoff}</p>
                    <p className="font-semibold text-[#0b1f4b]">
                      {tripLocationLabel(dropoff, dropoffAddress, { airportSuffix: t.airportSuffix })}
                    </p>
                    <p className="text-slate-600">{formatTripDate(endDate, locale)}</p>
                  </div>
                </div>
              </section>

              <PriceSummaryCard
                formatPrice={formatPrice}
                copy={t}
                carTitle={carTitle}
                dailyRate={dailyRate}
                pickupLabel={tripLocationLabel(pickup, pickupAddress, { airportSuffix: t.airportSuffix })}
                dropoffLabel={tripLocationLabel(dropoff, dropoffAddress, { airportSuffix: t.airportSuffix })}
                insuranceExtras={insuranceExtras}
                paidExtras={paidExtras}
                extraQty={extraQty}
                totals={totals}
                extrasLineTotal={extrasLineTotal}
                securityDepositEur={securityDepositEur}
                loading={loading}
                error={error}
                onPayNow={() => goToPaymentStep()}
              />
            </aside>
          </form>
        )}
      </div>

      <RentalTermsModal
        open={rentalTermsOpen}
        onClose={() => setRentalTermsOpen(false)}
        title={t.rentalTermsModalTitle}
        items={rentalTermsItems}
        disclaimer={t.rentalTermsDisclaimer}
        closeLabel={t.rentalTermsClose}
      />
      <LegalDocumentModal
        open={bookingTermsOpen}
        onClose={() => setBookingTermsOpen(false)}
        title={t.bookingTermsModalTitle}
        body={bookingTermsBody || dictionary.common.termsBody}
        fileUrl={bookingTermsFileUrl}
        openFileLabel={t.bookingTermsOpenFile}
        closeLabel={t.rentalTermsClose}
      />
      <GuestBookingNoticeModal
        open={guestNoticeOpen}
        title={t.guestNoticeTitle}
        body={t.guestNoticeBody}
        remember={t.guestNoticeRemember}
        continueLabel={t.guestNoticeContinue}
        emailLabel={t.guestNoticeEmailLabel}
        bookingNumberLabel={t.guestNoticeBookingLabel}
        email={email}
        bookingReference={previewBookingRef}
        onContinue={proceedToPaymentAfterNotice}
        onClose={() => setGuestNoticeOpen(false)}
      />
    </div>
  );
}

function Step({
  label,
  active = false,
  href,
  onClick,
}: {
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = cn(
    "flex-1 rounded-xl border-2 px-3 py-2.5 text-center text-[11px] font-extrabold tracking-wide shadow-sm sm:text-xs",
    active
      ? "border-[#1a5fd4] bg-[#1d6fe8] text-white ring-1 ring-[#1d6fe8]/40 [background-image:repeating-linear-gradient(-45deg,rgba(255,255,255,0.12)_0_8px,transparent_8px_16px)]"
      : "border-slate-300 bg-slate-50 text-slate-600",
    (href || onClick) &&
      !active &&
      "cursor-pointer transition hover:border-[#1d6fe8] hover:bg-[#eef5ff] hover:text-[#0b1f4b]",
  );

  if (href && !active) {
    return (
      <Link href={href} className={cn(className, "block")}>
        {label}
      </Link>
    );
  }

  if (onClick && !active) {
    return (
      <button type="button" onClick={onClick} className={cn(className, "w-full")}>
        {label}
      </button>
    );
  }

  return <div className={className}>{label}</div>;
}

function Spec({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {label}
    </span>
  );
}

function UpsellRow({
  title,
  body,
  value,
  onChange,
  purchaseQuestion,
  yesLabel,
  noLabel,
}: {
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
  purchaseQuestion: string;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-orange-950">{title}</p>
        <p className="text-xs text-orange-900/80">{body}</p>
      </div>
      <div className="text-xs font-semibold text-orange-950">
        <p className="mb-1">{purchaseQuestion}</p>
        <label className="me-3 inline-flex items-center gap-1">
          <input type="radio" checked={value} onChange={() => onChange(true)} /> {yesLabel}
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="radio" checked={!value} onChange={() => onChange(false)} /> {noLabel}
        </label>
      </div>
    </div>
  );
}

function PriceSummaryCard({
  formatPrice,
  copy,
  carTitle,
  dailyRate,
  pickupLabel,
  dropoffLabel,
  insuranceExtras,
  paidExtras,
  extraQty,
  totals,
  securityDepositEur,
  loading,
  error,
  onPayNow,
}: {
  formatPrice: (n: number) => string;
  copy: CheckoutCopy;
  carTitle: string;
  dailyRate: number;
  pickupLabel: string;
  dropoffLabel: string;
  insuranceExtras: ReservePaidExtra[];
  paidExtras: ReservePaidExtra[];
  extraQty: Record<string, number>;
  totals: ReturnType<typeof computeReserveTotals> & {
    deliveryFeeEur?: number;
    pickupDeliveryFeeEur?: number;
    dropoffDeliveryFeeEur?: number;
    cardSurcharge?: number;
    cardSurchargePercent?: number;
    total?: number;
    totalBefore?: number;
    payNow?: number;
    payNowBefore?: number;
    payAtPickup?: number;
    rentalTotalBefore?: number;
    bpDiscountActive?: boolean;
    bpDiscountPercent?: number;
  };
  extrasLineTotal?: number;
  securityDepositEur: number;
  loading: boolean;
  error?: string;
  onPayNow?: () => void;
}) {
  const { locale } = usePreferences();
  const pickupFee = toNumber(totals.pickupDeliveryFeeEur, 0);
  const dropoffFee = toNumber(totals.dropoffDeliveryFeeEur, 0);
  const isSelected = (extra: ReservePaidExtra) =>
    Boolean(extra.locked || (extraQty[extra.id] || 0) > 0);
  const selectedInsurance = insuranceExtras.filter(isSelected);
  const selectedPaid = paidExtras.filter(isSelected);

  const renderExtraLine = (extra: ReservePaidExtra) => {
    const qty = extra.locked ? Math.max(1, extraQty[extra.id] || 0) : extraQty[extra.id] || 0;
    const dayCount = Math.max(1, totals.days || 1);
    const uncapped = extra.priceEur * qty * dayCount;
    const line =
      extra.locked || extra.free
        ? 0
        : roundMoney(extraPeriodCharge(extra.priceEur, dayCount, qty, extra.maxPeriodEur, extra.minPeriodEur));
    const free = Boolean(extra.locked || extra.free || line <= 0);
    const capped = !free && extra.maxPeriodEur != null && line + 0.009 < uncapped;
    return (
      <LineItem
        key={extra.id}
        label={knownText(locale, extra.name)}
        value={formatPrice(line)}
        hint={
          free || capped
            ? undefined
            : copy.linePerDays(formatPrice(extra.priceEur * Math.max(qty, 1)), dayCount)
        }
      />
    );
  };

  const bpOn = Boolean(totals.bpDiscountActive);
  const totalNow = toNumber(totals.total, 0);
  const totalBefore = toNumber(totals.totalBefore, totalNow);
  const payNow = toNumber(totals.payNow, 0);
  const payNowBefore = toNumber(totals.payNowBefore, payNow);
  const payAtPickup = toNumber(totals.payAtPickup, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 rounded-t-lg border-b border-sky-200 bg-sky-100 px-4 py-3">
        <span className="text-base font-extrabold text-[#0b1f4b]">{copy.bookingSummary}</span>
        <span className="flex flex-col items-end leading-tight">
          {bpOn && totalBefore > totalNow + 0.009 ? (
            <span className="text-sm font-semibold text-slate-500 line-through">
              {formatPrice(totalBefore)}
            </span>
          ) : null}
          <span className="text-xl font-black text-[#0b1f4b]">{formatPrice(totalNow)}</span>
          {bpOn ? (
            <span className="text-[11px] font-bold text-emerald-700">
              −{totals.bpDiscountPercent}%
            </span>
          ) : null}
        </span>
      </div>
      <div className="space-y-2.5 px-4 py-3 text-sm">
        <LineItem
          label={carTitle}
          value={formatPrice(totals.rentalTotal)}
          valueBefore={
            bpOn && toNumber(totals.rentalTotalBefore, 0) > totals.rentalTotal + 0.009
              ? formatPrice(toNumber(totals.rentalTotalBefore, 0))
              : undefined
          }
          hint={copy.linePerDays(
            formatPrice(
              bpOn
                ? roundMoney(totals.rentalTotal / Math.max(1, totals.days || 1))
                : dailyRate,
            ),
            totals.days,
          )}
        />
        <LineItem
          label={copy.deliveryPickupAt(pickupLabel)}
          value={formatPrice(pickupFee)}
        />
        <LineItem
          label={copy.deliveryReturnAt(dropoffLabel)}
          value={formatPrice(dropoffFee)}
        />
        {selectedInsurance.map(renderExtraLine)}
        {selectedPaid.map(renderExtraLine)}
        {totals.protectionTotal > 0 ? (
          <LineItem
            label={copy.fullProtectionLabel}
            value={formatPrice(totals.protectionTotal)}
            hint={copy.linePerDays(formatPrice(totals.protectionDaily), totals.days)}
          />
        ) : null}
        {totals.cancellationTotal > 0 ? (
          <LineItem
            label={copy.cancellationLabel}
            value={formatPrice(totals.cancellationTotal)}
          />
        ) : null}
        {(totals.cardSurcharge || 0) > 0 ? (
          <LineItem
            label={copy.cardPayPlus.replace(
              "{percent}",
              String(totals.cardSurchargePercent || CARD_PICKUP_SURCHARGE_PERCENT),
            )}
            value={formatPrice(totals.cardSurcharge || 0)}
          />
        ) : null}
      </div>

      <div className="space-y-2.5 border-t border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-100 px-3.5 py-2.5">
          <span className="text-base font-semibold text-slate-700">{copy.refundableDeposit}</span>
          <span className="shrink-0 text-base font-extrabold text-[#0b1f4b]">
            {formatPrice(securityDepositEur)}
          </span>
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => onPayNow?.()}
          className="flex w-full min-h-[4.5rem] items-center justify-center rounded-xl bg-[#1d6fe8] px-4 py-3 text-white shadow-md transition hover:bg-[#1a64d4] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="text-sm font-bold">…</span>
          ) : (
            <span className="flex flex-col items-center justify-center text-center">
              {bpOn && payNowBefore > payNow + 0.009 ? (
                <span className="text-sm font-semibold text-white/70 line-through">
                  {formatPrice(payNowBefore)}
                </span>
              ) : null}
              <span className="text-xl font-black leading-none tracking-tight sm:text-2xl">
                {formatPrice(payNow)}
              </span>
              {bpOn ? (
                <span className="mt-1 text-[11px] font-bold text-emerald-200">
                  −{totals.bpDiscountPercent}%
                </span>
              ) : null}
              <span className="mt-1.5 text-sm font-extrabold leading-tight sm:text-base">
                <span className="block">{copy.payNowToBookLine1}</span>
                <span className="block">{copy.payNowToBookLine2}</span>
              </span>
            </span>
          )}
        </button>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <span className="text-base font-medium text-[#1d6fe8]">{copy.payOnSiteShort}</span>
          <span className="shrink-0 text-base font-extrabold text-[#1d6fe8]">
            {formatPrice(payAtPickup)}
          </span>
        </div>
      </div>
    </section>
  );
}

function ExtraDetailHint({
  open,
  onOpenChange,
  title,
  body,
  label,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  body: string;
  label: string;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth * 0.7);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    setCoords({ top: rect.bottom + 6, left });
  }, [open]);

  return (
    <span
      className="relative shrink-0"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-300/90 transition hover:bg-white hover:text-[#0f766e] hover:ring-[#0f766e]/40"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      {open && coords
        ? createPortal(
            <span
              role="tooltip"
              className="fixed z-[400] w-[min(18rem,70vw)] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-start text-xs leading-relaxed text-slate-700 shadow-lg ring-1 ring-slate-900/5"
              style={{ top: coords.top, left: coords.left }}
              onMouseEnter={() => onOpenChange(true)}
              onMouseLeave={() => onOpenChange(false)}
            >
              <span className="mb-1 block text-[11px] font-extrabold text-[#0b1f4b]">{title}</span>
              {body}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function LineItem({
  label,
  value,
  valueBefore,
  hint,
}: {
  label: string;
  value: string;
  valueBefore?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <span className="flex shrink-0 flex-col items-end leading-tight">
        {valueBefore ? (
          <span className="text-xs font-semibold text-slate-400 line-through">{valueBefore}</span>
        ) : null}
        <span className="font-bold text-slate-900">{value}</span>
      </span>
    </div>
  );
}

/** Age in full years as of pickup date (or today if pickup is invalid). */
function ageFromDateOfBirth(dob: string, asOfIso?: string): number | null {
  const raw = dob.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const birth = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const asOfRaw = (asOfIso || "").trim().slice(0, 10);
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw)
    ? new Date(`${asOfRaw}T12:00:00`)
    : new Date();
  if (Number.isNaN(asOf.getTime()) || birth > asOf) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}
