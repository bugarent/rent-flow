"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { PARTNER_BASE } from "@/lib/routes";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { cn } from "@/lib/utils";
import { formatRegistrationNumberDisplay } from "@/lib/cars/registration-number";
import {
  PartnerBookingDetailModal,
  type FleetBookingDetail,
} from "@/components/partner/partner-booking-detail-modal";
import {
  BookingInfoModal,
  type BookingInfoData,
} from "@/components/bookings/booking-info-modal";
import { formatBookingRef } from "@/lib/ids";
import { clampPickupSelection, earliestPickupIsoDate, isPickupSlotAllowed } from "@/lib/bookings/lead-time";
import { uiLocaleTag } from "@/lib/i18n/ui-text";
import {
  insuranceExpiryReasonLabel,
  isInsuranceExpiryReason,
} from "@/lib/cars/insurance-expiry-reason";

function digitsOnlyBookingQuery(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^[#dD]+/, "")
    .replace(/\D/g, "");
}

type CarRow = {
  id: string;
  label: string;
  make: string;
  model: string;
  year: number;
  status: string;
  registrationNumber?: string | null;
  hiddenReason?: string | null;
  rejectionNote?: string | null;
};

type BookingBar = FleetBookingDetail;

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_H = 52;
const HEADER_H = 56;
const SIDEBAR_W_DESKTOP = 168;
const SIDEBAR_W_MOBILE = 108;
const MONTH_LONG_PRESS_MS = 420;
const MONTH_SWIPE_PX = 56;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

type DeliveryPlaceOpt = {
  cityName: string;
  label: string;
  kind?: "airport" | "city";
  iata?: string;
};

function cityOptionsFromPlaces(places: DeliveryPlaceOpt[]): string[] {
  return [...new Set(places.map((p) => p.cityName.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

function addressOptionsForCity(city: string, places: DeliveryPlaceOpt[], locale: string): string[] {
  const c = city.trim();
  if (!c) return [];
  const office =
    locale === "ka" ? `${c} ოფისი` : locale === "ru" ? `Офис ${c}` : `${c} office`;
  const territory =
    locale === "ka" ? `${c} ტერიტორია` : locale === "ru" ? `Территория ${c}` : `${c} territory`;
  const airportLabel =
    locale === "ka" ? `${c} აეროპორტი` : locale === "ru" ? `Аэропорт ${c}` : `${c} airport`;
  const opts: string[] = [];
  const seen = new Set<string>();
  const push = (v: string) => {
    const t = v.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    opts.push(t);
  };
  for (const p of places) {
    if (p.cityName.trim().toLowerCase() !== c.toLowerCase()) continue;
    if (p.kind === "airport" || (p.iata && !String(p.iata).toUpperCase().startsWith("CITY-"))) {
      push(airportLabel);
      break;
    }
  }
  push(office);
  push(territory);
  return opts;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function eachDay(from: Date, days: number) {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function weekdayShort(d: Date, locale: string) {
  return d.toLocaleDateString(uiLocaleTag(locale), {
    weekday: "short",
  });
}

function monthNames(locale: string) {
  const loc = uiLocaleTag(locale);
  return Array.from({ length: 12 }, (_, i) =>
    new Date(2026, i, 1).toLocaleDateString(loc, { month: "long" }),
  );
}

/** Site bookings = green; closed/blocked dates = blue; completed = muted. */
function statusBarClass(bar: BookingBar) {
  // Partner manual close / office block → sky (unchanged).
  if (bar.kind === "block" || bar.status === "BLOCKED") {
    return "border-sky-400 bg-sky-300/90 text-sky-950";
  }
  if (bar.status === "CANCELLED") {
    return "border-rose-500 bg-rose-200/95 text-rose-950";
  }
  if (bar.updatedUnread) {
    return "partner-booking-updated-blink border-emerald-600 text-emerald-950";
  }
  // Website customer bookings → green.
  if (bar.status === "COMPLETED") return "border-emerald-500 bg-emerald-300/90 text-emerald-950";
  return "border-emerald-500 bg-emerald-400/90 text-emerald-950";
}

function isWeekBoundaryDay(d: Date) {
  return d.getDay() === 0;
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function dayCellClass(d: Date) {
  return cn(
    "box-border h-full min-w-0 flex-1 border-e border-b border-slate-200",
    isWeekBoundaryDay(d) ? "bg-slate-100" : "bg-white",
  );
}

/** Green only after admin APPROVED; everything else awaiting review stays yellow. */
function needsAttentionStatus(status: string) {
  return status !== "APPROVED";
}

function carWindowClass(status: string) {
  return needsAttentionStatus(status) ? "bg-amber-400" : "bg-emerald-500";
}

export function PartnerFleetCalendar() {
  const router = useRouter();
  const { locale, dictionary } = usePartnerLocale();
  const t = dictionary.calendar;
  const [sidebarW, setSidebarW] = useState(SIDEBAR_W_DESKTOP);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [debouncedQ, setDebouncedQ] = useState("");
  const [cars, setCars] = useState<CarRow[]>([]);
  const [bookings, setBookings] = useState<BookingBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewingInfo, setViewingInfo] = useState<BookingInfoData | null>(null);
  const [catalogExtras, setCatalogExtras] = useState<
    Array<{ id: string; label: string; priceEurPerDay: number }>
  >([]);
  const [blockCarId, setBlockCarId] = useState<string | null>(null);
  const [blockFromDate, setBlockFromDate] = useState("");
  const [blockToDate, setBlockToDate] = useState("");
  const [blockFromTime, setBlockFromTime] = useState("10:00");
  const [blockToTime, setBlockToTime] = useState("10:00");
  const [blockSaving, setBlockSaving] = useState(false);
  const [noticeCar, setNoticeCar] = useState<CarRow | null>(null);
  const [deliveryPlaces, setDeliveryPlaces] = useState<
    Array<{ cityName: string; label: string; kind?: "airport" | "city"; iata?: string }>
  >([]);
  const [pickupCity, setPickupCity] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [showPickupNote, setShowPickupNote] = useState(false);
  const [showDropoffNote, setShowDropoffNote] = useState(false);
  const [pickupNote, setPickupNote] = useState("");
  const [dropoffNote, setDropoffNote] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessengers, setGuestMessengers] = useState<string[]>([]);
  const [showAltPhone, setShowAltPhone] = useState(false);
  const [altPhone, setAltPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [payNow, setPayNow] = useState("0");
  const [payOnPickup, setPayOnPickup] = useState("0");
  const [deposit, setDeposit] = useState("0");
  const [agent, setAgent] = useState("");
  const [monthSwipeArmed, setMonthSwipeArmed] = useState(false);
  const suppressCellClickRef = useRef(false);
  const monthSwipeRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    timer: ReturnType<typeof setTimeout> | null;
    armed: boolean;
    committed: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    timer: null,
    armed: false,
    committed: false,
  });

  const clearMonthSwipe = useCallback(() => {
    const s = monthSwipeRef.current;
    if (s.timer) clearTimeout(s.timer);
    s.timer = null;
    s.pointerId = null;
    s.armed = false;
    s.committed = false;
    setMonthSwipeArmed(false);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setSidebarW(mq.matches ? SIDEBAR_W_MOBILE : SIDEBAR_W_DESKTOP);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const shiftMonth = useCallback((delta: number) => {
    setMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() + delta, 1)));
  }, []);

  const onMonthSwipePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      const s = monthSwipeRef.current;
      if (s.timer) clearTimeout(s.timer);
      s.pointerId = e.pointerId;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.armed = false;
      s.committed = false;
      setMonthSwipeArmed(false);
      s.timer = setTimeout(() => {
        if (monthSwipeRef.current.pointerId !== e.pointerId) return;
        monthSwipeRef.current.armed = true;
        setMonthSwipeArmed(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }, MONTH_LONG_PRESS_MS);
    },
    [],
  );

  const onMonthSwipePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = monthSwipeRef.current;
      if (s.pointerId !== e.pointerId) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (!s.armed) {
        if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
          if (s.timer) clearTimeout(s.timer);
          s.timer = null;
        }
        return;
      }
      if (s.committed) return;
      if (Math.abs(dx) < MONTH_SWIPE_PX) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      s.committed = true;
      suppressCellClickRef.current = true;
      shiftMonth(dx < 0 ? 1 : -1);
      clearMonthSwipe();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [clearMonthSwipe, shiftMonth],
  );

  const onMonthSwipePointerEnd = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (monthSwipeRef.current.pointerId !== e.pointerId) return;
      clearMonthSwipe();
    },
    [clearMonthSwipe],
  );

  useEffect(() => () => clearMonthSwipe(), [clearMonthSwipe]);

  const dayCount = daysInMonth(month);
  const rangeFrom = month;
  const rangeTo = addDays(month, dayCount);
  const rangeFromMs = rangeFrom.getTime();
  const rangeToMs = rangeTo.getTime();
  const days = useMemo(() => eachDay(new Date(rangeFromMs), dayCount), [rangeFromMs, dayCount]);
  const months = useMemo(() => monthNames(locale), [locale]);
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => y - 2 + i);
  }, []);

  useEffect(() => {
    const fromUrl = digitsOnlyBookingQuery(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("q") || ""
        : "",
    );
    if (fromUrl) {
      setQuery(fromUrl);
      setDebouncedQ(fromUrl);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(digitsOnlyBookingQuery(query)), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        from: new Date(rangeFromMs).toISOString(),
        to: new Date(rangeToMs).toISOString(),
        locale,
      });
      const qDigits = digitsOnlyBookingQuery(debouncedQ);
      if (qDigits) params.set("q", qDigits);
      const res = await fetch(`/api/partners/fleet-calendar?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCars(data.cars || []);
      setBookings(
        ((data.bookings || []) as BookingBar[]).filter((b) => b.status !== "CANCELLED"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setCars([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [rangeFromMs, rangeToMs, locale, debouncedQ]);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = bookings.find((b) => b.id === selectedId) ?? null;
  const blockCar = cars.find((c) => c.id === blockCarId) ?? null;
  const blockCities = useMemo(() => cityOptionsFromPlaces(deliveryPlaces), [deliveryPlaces]);
  const pickupAddressOptions = useMemo(
    () => addressOptionsForCity(pickupCity, deliveryPlaces, locale),
    [pickupCity, deliveryPlaces, locale],
  );
  const dropoffAddressOptions = useMemo(
    () => addressOptionsForCity(dropoffCity, deliveryPlaces, locale),
    [dropoffCity, deliveryPlaces, locale],
  );

  useEffect(() => {
    if (!pickupCity || !pickupAddressOptions.length) return;
    if (!pickupAddressOptions.includes(pickupAddress)) {
      setPickupAddress(pickupAddressOptions[0] || "");
    }
  }, [pickupCity, pickupAddressOptions, pickupAddress]);

  useEffect(() => {
    if (!dropoffCity || !dropoffAddressOptions.length) return;
    if (!dropoffAddressOptions.includes(dropoffAddress)) {
      setDropoffAddress(dropoffAddressOptions[0] || "");
    }
  }, [dropoffCity, dropoffAddressOptions, dropoffAddress]);

  const openBlockModal = (carId: string, day?: Date) => {
    const start = day || new Date();
    const slot = clampPickupSelection(yyyyMmDd(start), "10:00", TIME_OPTIONS);
    setBlockCarId(carId);
    setBlockFromDate(slot.date);
    setBlockToDate(yyyyMmDd(addDays(new Date(`${slot.date}T12:00:00`), 1)));
    setBlockFromTime(slot.time);
    setBlockToTime("10:00");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestMessengers([]);
    setShowAltPhone(false);
    setAltPhone("");
    setShowPickupNote(false);
    setShowDropoffNote(false);
    setPickupNote("");
    setDropoffNote("");
    setTotalAmount("0");
    setPayNow("0");
    setPayOnPickup("0");
    setDeposit("100");
    setAgent("");
    setPickupAddress("");
    setDropoffAddress("");
    void (async () => {
      try {
        const res = await fetch("/api/partners/me", { cache: "no-store" });
        const me = await res.json();
        if (!res.ok) return;
        const catalog = Array.isArray(me.deliveryCatalog) ? me.deliveryCatalog : [];
        const places: DeliveryPlaceOpt[] = catalog
          .map(
            (loc: {
              cityName?: string;
              label?: string;
              iata?: string;
              kind?: "airport" | "city";
            }) => {
              const label = String(loc.label || loc.iata || "").trim();
              const cityName = String(loc.cityName || "").trim();
              if (!cityName && !label) return null;
              return {
                cityName: cityName || label.split("(")[0]?.trim() || label,
                label: label || cityName,
                kind: loc.kind,
                iata: loc.iata,
              };
            },
          )
          .filter(Boolean) as DeliveryPlaceOpt[];
        setDeliveryPlaces(places);
        const cities = cityOptionsFromPlaces(places);
        const first = cities[0] || "";
        setPickupCity(first);
        setDropoffCity(first);
        const addrs = addressOptionsForCity(first, places, locale);
        setPickupAddress(addrs[0] || "");
        setDropoffAddress(addrs[0] || "");
      } catch {
        setDeliveryPlaces([]);
      }
    })();
  };

  const toggleMessenger = (name: string) => {
    setGuestMessengers((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  const saveBlock = async () => {
    if (!blockCarId || !blockFromDate || !blockToDate) return;
    setBlockSaving(true);
    setError("");
    try {
      const fromIso = new Date(`${blockFromDate}T${blockFromTime}:00`).toISOString();
      const toIso = new Date(`${blockToDate}T${blockToTime}:00`).toISOString();
      if (!(new Date(toIso).getTime() > new Date(fromIso).getTime())) {
        throw new Error(
          locale === "ka"
            ? "დასრულება უნდა იყოს დაწყებაზე მოგვიანებით"
            : locale === "ru"
              ? "Окончание должно быть позже начала"
              : "End must be after start",
        );
      }
      const guestLabel = guestName.trim();
      const label = guestLabel
        ? guestLabel
        : locale === "ka"
          ? "ოფისი / დახურული"
          : locale === "ru"
            ? "Офис / закрыто"
            : "Rental office";
      const res = await fetch("/api/partners/calendar-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: blockCarId,
          from: fromIso,
          to: toIso,
          label,
          meta: {
            pickupCity,
            dropoffCity,
            pickupAddress,
            dropoffAddress,
            pickupNote: showPickupNote ? pickupNote : "",
            dropoffNote: showDropoffNote ? dropoffNote : "",
            guestName,
            guestEmail,
            guestPhone,
            guestLang: locale === "ka" ? "KA" : locale === "ru" ? "RU" : "EN",
            messengers: guestMessengers,
            altPhone: showAltPhone ? altPhone : "",
            totalAmount,
            payNow,
            payOnPickup,
            deposit,
            agent,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setBlockCarId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBlockSaving(false);
    }
  };

  const deleteBlock = async (id: string) => {
    setBlockSaving(true);
    try {
      const res = await fetch(`/api/partners/calendar-blocks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBlockSaving(false);
    }
  };

  const openBookingInfo = (bar: BookingBar) => {
    const car = cars.find((c) => c.id === bar.carId);
    const carParts = (bar.carLabel || car?.label || "").trim().split(/\s+/);
    setViewingInfo({
      id: bar.id,
      sequentialNumber: bar.sequentialNumber,
      reference: formatBookingRef(bar.sequentialNumber),
      status: bar.status,
      pickupAt: bar.pickupAt,
      dropoffAt: bar.dropoffAt,
      flightNumber: bar.flightNumber,
      totalPriceEur: Number(bar.totalPriceEur) || 0,
      depositPercent: bar.depositPercent,
      depositPaidEur: Number(bar.depositPaidEur) || 0,
      balanceDueEur: Number(bar.balanceDueEur) || 0,
      guestFirstName: bar.guestFirstName,
      guestLastName: bar.guestLastName,
      guestEmail: bar.guestEmail,
      guestPhone: bar.guestPhone,
      guestMessenger: bar.guestMessenger,
      guestMessengers: bar.messengers,
      dateOfBirth: bar.dateOfBirth,
      extras: bar.extras || [],
      carId: bar.carId,
      car: {
        make: car?.make || carParts[0] || "—",
        model: car?.model || carParts.slice(1).join(" ") || "",
        year: car?.year,
        registrationNumber: bar.registrationNumber || car?.registrationNumber || undefined,
      },
      delivery: {
        pickupLabel: bar.pickupLabel || bar.pickupAddress || "—",
        dropoffLabel: bar.dropoffLabel || bar.dropoffAddress || "—",
        pickupShort: bar.barLabel || "",
        dropoffShort: bar.endLabel || "",
        pickupFeeEur: 0,
        dropoffFeeEur: 0,
        totalFeeEur: 0,
      },
      pickupAddress: bar.pickupAddress,
      dropoffAddress: bar.dropoffAddress,
    });
    void (async () => {
      try {
        const res = await fetch(`/api/partners/bookings/${encodeURIComponent(bar.id)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.booking) {
          const detail = data.booking as BookingInfoData & {
            catalogExtras?: Array<{ id: string; label: string; priceEurPerDay: number }>;
          };
          setCatalogExtras(detail.catalogExtras || []);
          setViewingInfo(detail);
        }
      } catch {
        /* keep optimistic view */
      }
    })();
  };

  const blockCopy =
    locale === "ka"
      ? {
          title: "პერიოდის დახურვა",
          from: "აღების თარიღი",
          to: "დაბრუნების თარიღი",
          fromTime: "აღების დრო",
          toTime: "დაბრუნების დრო",
          pickupCity: "აყვანის ქალაქი",
          dropoffCity: "დაბრუნების ქალაქი",
          pickupAddress: "აღების მისამართი",
          dropoffAddress: "ჩაბარების მისამართი",
          pickupNote: "აღების ცნობა",
          dropoffNote: "დაბრუნების შენიშვნა",
          customer: "მომხმარებელი",
          guestName: "მომხმარებლის სახელი",
          guestEmail: "მომხმარებლის ელ. ფოსტა",
          guestPhone: "ძირითადი მობილური ნომერი",
          altPhone: "ალტერნატიული ტელეფონის ნომერი",
          dob: "დაბადების თარიღი",
          total: "სულ",
          payNow: "ახლავე გადასახდელი",
          payPickup: "გადახდა აღებისას",
          deposit: "დეპოზიტი",
          noAgent: "აგენტი არ არის",
          save: "შენახვა",
          cancel: "გაუქმება",
        }
      : locale === "ru"
        ? {
            title: "Закрытие периода",
            from: "Дата получения",
            to: "Дата возврата",
            fromTime: "Время получения",
            toTime: "Время возврата",
            pickupCity: "Город получения",
            dropoffCity: "Город возврата",
            pickupAddress: "Адрес получения",
            dropoffAddress: "Адрес возврата",
            pickupNote: "Заметка получения",
            dropoffNote: "Заметка возврата",
            customer: "Клиент",
            guestName: "Имя клиента",
            guestEmail: "Email клиента",
            guestPhone: "Основной мобильный",
            altPhone: "Альтернативный телефон",
            dob: "Дата рождения",
            total: "Итого",
            payNow: "Оплатить сейчас",
            payPickup: "Оплата при получении",
            deposit: "Депозит",
            noAgent: "Без агента",
            save: "Сохранить",
            cancel: "Отмена",
          }
        : {
            title: "Close period",
            from: "Pick-up date",
            to: "Return date",
            fromTime: "Pick-up time",
            toTime: "Return time",
            pickupCity: "Pick-up city",
            dropoffCity: "Return city",
            pickupAddress: "Pick-up address",
            dropoffAddress: "Drop-off address",
            pickupNote: "Pick-up note",
            dropoffNote: "Return note",
            customer: "Customer",
            guestName: "Customer name",
            guestEmail: "Customer Email",
            guestPhone: "Primary mobile number",
            altPhone: "Alternate phone number",
            dob: "Date of birth",
            total: "Total",
            payNow: "To pay now",
            payPickup: "To pay on pickup",
            deposit: "Deposit",
            noAgent: "No agent",
            save: "Save",
            cancel: "Cancel",
          };

  const rangeStartMs = rangeFrom.getTime();
  const rangeSpanMs = dayCount * DAY_MS;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-[#f4f6f9]">
      <div className="relative m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#d5dde6] bg-white shadow-[0_1px_2px_rgba(26,0,64,0.04)] sm:m-3">
        {error ? (
          <p className="m-4 shrink-0 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
          {/* Sticky header */}
          <div
            className="sticky top-0 z-20 flex border-b-2 border-slate-300 bg-white"
            style={{ height: HEADER_H }}
          >
            <div
              className="sticky start-0 z-30 flex shrink-0 flex-col border-e-2 border-slate-300 bg-white"
              style={{ width: sidebarW, height: HEADER_H }}
            >
              <div className="flex h-8 items-center gap-1 border-b border-[#cfd8e3] bg-[#d9e2e8] px-1.5">
                <select
                  aria-label="Month"
                  value={month.getMonth()}
                  onChange={(e) =>
                    setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))
                  }
                  className="min-w-0 flex-1 truncate rounded border-0 bg-transparent py-0.5 text-[11px] font-extrabold text-[#1e1b4b] outline-none"
                >
                  {months.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Year"
                  value={month.getFullYear()}
                  onChange={(e) =>
                    setMonth(new Date(Number(e.target.value), month.getMonth(), 1))
                  }
                  className="w-[4.25rem] shrink-0 rounded border-0 bg-transparent py-0.5 text-[11px] font-extrabold text-[#1e1b4b] outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-1 items-center justify-between gap-1 px-1.5">
                <p className="truncate text-[11px] font-bold text-slate-800">
                  {t.allCars} ({cars.length})
                </p>
                <Link
                  href={`${PARTNER_BASE}/cars/new`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                  title={t.addCar}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col select-none",
                monthSwipeArmed && "cursor-grabbing",
              )}
              style={{ height: HEADER_H, touchAction: monthSwipeArmed ? "none" : undefined }}
              onPointerDown={onMonthSwipePointerDown}
              onPointerMove={onMonthSwipePointerMove}
              onPointerUp={onMonthSwipePointerEnd}
              onPointerCancel={onMonthSwipePointerEnd}
            >
              <div className="flex min-w-0 flex-1">
                {days.map((d) => (
                  <div
                    key={`d-${d.toISOString()}`}
                    className={cn(
                      "box-border flex min-w-0 flex-1 flex-col items-center justify-center border-e border-b border-slate-200",
                      isToday(d)
                        ? "bg-sky-100 ring-2 ring-inset ring-sky-500"
                        : isWeekBoundaryDay(d)
                          ? "bg-slate-100"
                          : "bg-white",
                      monthSwipeArmed && "bg-sky-50",
                    )}
                    title={yyyyMmDd(d)}
                  >
                    <span className="text-[11px] font-bold leading-none text-slate-700">
                      {d.getDate()}
                    </span>
                    <span className="mt-0.5 text-[9px] leading-none text-slate-500">
                      {weekdayShort(d, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-center text-sm text-slate-500">{t.loading}</p>
          ) : null}

          {cars.map((car) => {
            const rowBookings = bookings.filter((b) => b.carId === car.id);
            const attention = needsAttentionStatus(car.status);
            return (
              <div
                key={car.id}
                className={cn(
                  "flex border-b-2",
                  attention ? "border-amber-300 bg-amber-100/80" : "border-slate-200",
                )}
                style={{ height: ROW_H }}
              >
                <div
                  className={cn(
                    "sticky start-0 z-10 flex shrink-0 items-center gap-1.5 border-e-2 px-1.5",
                    attention
                      ? "border-amber-300 bg-amber-200/90"
                      : "border-slate-300 bg-white",
                  )}
                  style={{ width: sidebarW, height: ROW_H }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (needsAttentionStatus(car.status)) {
                        setNoticeCar(car);
                        return;
                      }
                      router.push(`${PARTNER_BASE}/cars/${car.id}/edit`);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md text-start outline-none ring-sky-400 hover:bg-slate-50 focus-visible:ring-2"
                    title={`${car.make} ${car.model}`}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-extrabold text-white",
                        carWindowClass(car.status),
                      )}
                    >
                      {(car.make || "A").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold leading-tight text-slate-900">
                        {car.make} {car.model}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {[
                          car.registrationNumber
                            ? formatRegistrationNumberDisplay(car.registrationNumber)
                            : null,
                          car.year,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    title={blockCopy.title}
                    onClick={() => openBlockModal(car.id)}
                    className="shrink-0 rounded border border-sky-300 bg-sky-50 px-1 py-0.5 text-[10px] font-bold text-sky-800 hover:bg-sky-100"
                  >
                    +
                  </button>
                </div>

                <div
                  className={cn(
                    "relative min-w-0 flex-1 select-none",
                    attention && "bg-amber-50/90",
                    monthSwipeArmed && "cursor-grabbing",
                  )}
                  style={{ height: ROW_H, touchAction: monthSwipeArmed ? "none" : undefined }}
                  onPointerDown={onMonthSwipePointerDown}
                  onPointerMove={onMonthSwipePointerMove}
                  onPointerUp={onMonthSwipePointerEnd}
                  onPointerCancel={onMonthSwipePointerEnd}
                >
                  <div className="absolute inset-0 flex">
                    {days.map((d) => (
                      <button
                        key={d.toISOString()}
                        type="button"
                        aria-label={yyyyMmDd(d)}
                        data-date={yyyyMmDd(d)}
                        title={yyyyMmDd(d)}
                        onClick={() => {
                          if (suppressCellClickRef.current) {
                            suppressCellClickRef.current = false;
                            return;
                          }
                          if (yyyyMmDd(d) < earliestPickupIsoDate()) return;
                          openBlockModal(car.id, d);
                        }}
                        className={cn(
                          attention
                            ? cn(
                                "box-border h-full min-w-0 flex-1 border-e border-b border-amber-200/80",
                                isWeekBoundaryDay(d) ? "bg-amber-200/50" : "bg-amber-100/40",
                              )
                            : dayCellClass(d),
                          isToday(d) && "bg-sky-100/80 ring-2 ring-inset ring-sky-400",
                          yyyyMmDd(d) < earliestPickupIsoDate()
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer transition-colors hover:bg-sky-50/80 focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400",
                          monthSwipeArmed && "bg-sky-50/90",
                        )}
                      />
                    ))}
                  </div>

                  {isInsuranceExpiryReason(car.hiddenReason) ? (
                    <div className="pointer-events-none absolute inset-x-1 top-1/2 z-[1] flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md bg-amber-400 px-2 text-[11px] font-extrabold text-amber-950 shadow-sm ring-1 ring-amber-700/25">
                      <span className="truncate">{insuranceExpiryReasonLabel(locale)}</span>
                    </div>
                  ) : null}

                  {rowBookings.map((b) => {
                    const start = new Date(b.pickupAt).getTime();
                    const end = new Date(b.dropoffAt).getTime();
                    const clampedStart = Math.max(start, rangeStartMs);
                    const clampedEnd = Math.min(end, rangeStartMs + rangeSpanMs);
                    if (clampedEnd <= clampedStart) return null;
                    const leftPct = ((clampedStart - rangeStartMs) / rangeSpanMs) * 100;
                    const widthPct = Math.max(
                      1.2,
                      ((clampedEnd - clampedStart) / rangeSpanMs) * 100,
                    );
                    return (
                      <button
                        key={b.id}
                        type="button"
                        title={
                          b.sequentialNumber
                            ? `#${b.sequentialNumber} · ${b.barLabel} → ${b.endLabel}`
                            : `${b.barLabel} → ${b.endLabel}`
                        }
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onMonthSwipePointerDown(e);
                        }}
                        onPointerMove={(e) => {
                          e.stopPropagation();
                          onMonthSwipePointerMove(e);
                        }}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          onMonthSwipePointerEnd(e);
                        }}
                        onPointerCancel={(e) => {
                          e.stopPropagation();
                          onMonthSwipePointerEnd(e);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (suppressCellClickRef.current) {
                            suppressCellClickRef.current = false;
                            return;
                          }
                          const isBlock = b.kind === "block" || b.status === "BLOCKED";
                          if (isBlock) {
                            setSelectedId(b.id);
                          } else {
                            openBookingInfo(b);
                          }
                          if (b.updatedUnread) {
                            setBookings((prev) =>
                              prev.map((row) =>
                                row.id === b.id ? { ...row, updatedUnread: false } : row,
                              ),
                            );
                            void fetch("/api/partners/bookings/update-read", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ bookingId: b.id }),
                            }).catch(() => {
                              /* best-effort */
                            });
                          }
                        }}
                        className={cn(
                          "absolute top-1.5 z-[2] overflow-hidden rounded-md border px-1 py-0.5 text-left text-[9px] font-semibold leading-tight shadow-sm select-none",
                          statusBarClass(b),
                          (selectedId === b.id || viewingInfo?.id === b.id) &&
                            "ring-2 ring-[#1e1b4b]",
                          monthSwipeArmed && "cursor-grabbing ring-1 ring-sky-400",
                        )}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          height: ROW_H - 12,
                          touchAction: monthSwipeArmed ? "none" : undefined,
                        }}
                      >
                        <div className="flex h-full min-w-0 items-center justify-between gap-0.5 overflow-hidden px-0.5">
                          <span className="min-w-0 flex-1 truncate text-left">
                            {b.status === "CANCELLED"
                              ? `${locale === "ru" ? "Отменено" : locale === "ka" ? "გაუქმებული" : "Cancelled"} · ${b.barLabel}`
                              : b.barLabel}
                          </span>
                          {b.updatedUnread ? (
                            <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold leading-none tracking-wide text-emerald-900 shadow-sm">
                              {t.updated}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate text-right opacity-95">{b.endLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!loading && cars.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <p>{t.noCars}</p>
              <Link href={`${PARTNER_BASE}/cars/new`} className="mt-3 inline-block font-semibold text-sky-700">
                {t.addCar}
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {selected && (selected.kind === "block" || selected.status === "BLOCKED") ? (
        <PartnerBookingDetailModal
          booking={selected}
          carLabel={cars.find((c) => c.id === selected.carId)?.label}
          locale={locale}
          readOnly={false}
          onClose={() => setSelectedId(null)}
          onChanged={async () => {
            await load();
          }}
          onDeleteBlock={(id) => void deleteBlock(id)}
        />
      ) : null}

      {viewingInfo ? (
        <BookingInfoModal
          open
          booking={viewingInfo}
          locale={locale}
          role="partner"
          catalogExtras={catalogExtras}
          calendarView
          hidePartnerSection
          onClose={() => setViewingInfo(null)}
        />
      ) : null}

      {blockCarId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-3">
          <div className="flex max-h-[min(92dvh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-1.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {blockCopy.title}
                </p>
                <p className="text-sm font-extrabold text-[#0b1f4b]">
                  {blockCar ? `${blockCar.make} ${blockCar.model}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBlockCarId(null)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label={blockCopy.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.75fr)]">
                <div className="space-y-1.5 border-b border-slate-100 p-2.5 lg:border-b-0 lg:border-e">
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.from}
                      <input
                        type="date"
                        value={blockFromDate}
                        min={earliestPickupIsoDate()}
                        onChange={(e) => {
                          const slot = clampPickupSelection(e.target.value, blockFromTime, TIME_OPTIONS);
                          setBlockFromDate(slot.date);
                          setBlockFromTime(slot.time);
                        }}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.to}
                      <input
                        type="date"
                        value={blockToDate}
                        min={blockFromDate || earliestPickupIsoDate()}
                        onChange={(e) =>
                          setBlockToDate(
                            e.target.value < (blockFromDate || earliestPickupIsoDate())
                              ? blockFromDate || earliestPickupIsoDate()
                              : e.target.value,
                          )
                        }
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.fromTime}
                      <select
                        value={blockFromTime}
                        onChange={(e) => setBlockFromTime(e.target.value)}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={`f-${opt}`} value={opt} disabled={!isPickupSlotAllowed(blockFromDate, opt)}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.toTime}
                      <select
                        value={blockToTime}
                        onChange={(e) => setBlockToTime(e.target.value)}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option
                            key={`t-${opt}`}
                            value={opt}
                            disabled={blockToDate === blockFromDate && opt <= blockFromTime}
                          >
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.pickupCity}
                      <select
                        value={pickupCity}
                        onChange={(e) => setPickupCity(e.target.value)}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      >
                        {(blockCities.length ? blockCities : [pickupCity || "—"]).map((c) => (
                          <option key={`pc-${c}`} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.dropoffCity}
                      <select
                        value={dropoffCity}
                        onChange={(e) => setDropoffCity(e.target.value)}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      >
                        {(blockCities.length ? blockCities : [dropoffCity || "—"]).map((c) => (
                          <option key={`dc-${c}`} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.pickupAddress}
                      <select
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      >
                        {(pickupAddressOptions.length
                          ? pickupAddressOptions
                          : [pickupAddress || "—"]
                        ).map((a) => (
                          <option key={`pa-${a}`} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      {blockCopy.dropoffAddress}
                      <select
                        value={dropoffAddress}
                        onChange={(e) => setDropoffAddress(e.target.value)}
                        className="mt-0.5 h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      >
                        {(dropoffAddressOptions.length
                          ? dropoffAddressOptions
                          : [dropoffAddress || "—"]
                        ).map((a) => (
                          <option key={`da-${a}`} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-emerald-700">
                    <button type="button" onClick={() => setShowPickupNote((v) => !v)}>
                      {blockCopy.pickupNote}
                    </button>
                    <button type="button" onClick={() => setShowDropoffNote((v) => !v)}>
                      {blockCopy.dropoffNote}
                    </button>
                  </div>
                  {showPickupNote ? (
                    <textarea
                      value={pickupNote}
                      onChange={(e) => setPickupNote(e.target.value)}
                      rows={1}
                      className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-xs"
                      placeholder={blockCopy.pickupNote}
                    />
                  ) : null}
                  {showDropoffNote ? (
                    <textarea
                      value={dropoffNote}
                      onChange={(e) => setDropoffNote(e.target.value)}
                      rows={1}
                      className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-xs"
                      placeholder={blockCopy.dropoffNote}
                    />
                  ) : null}

                  <div className="border-t border-slate-100 pt-2">
                    <div className="mb-1.5 flex items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-900">{blockCopy.customer}</p>
                      <span className="rounded bg-slate-200 px-1 py-px text-[9px] font-bold uppercase text-slate-600">
                        {locale === "ka" ? "KA" : locale === "ru" ? "RU" : "EN"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={blockCopy.guestName}
                        className="h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      />
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder={blockCopy.guestEmail}
                        className="h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      />
                      <input
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder={blockCopy.guestPhone}
                        className="h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                      />
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-700">
                        {(["Telegram", "WhatsApp", "Viber"] as const).map((m) => (
                          <label key={m} className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={guestMessengers.includes(m)}
                              onChange={() => toggleMessenger(m)}
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-emerald-700"
                        onClick={() => setShowAltPhone((v) => !v)}
                      >
                        {blockCopy.altPhone}
                      </button>
                      {showAltPhone ? (
                        <input
                          type="tel"
                          value={altPhone}
                          onChange={(e) => setAltPhone(e.target.value)}
                          placeholder={blockCopy.altPhone}
                          className="h-7 w-full rounded-md border border-slate-300 px-1.5 text-xs"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{blockCopy.total}</span>
                    <input
                      value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        setPayOnPickup(e.target.value);
                      }}
                      className="h-7 w-24 rounded-md border border-slate-300 bg-white px-1.5 text-right text-xs"
                    />
                  </div>
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                    <span>{blockCopy.payNow}</span>
                    <input
                      value={payNow}
                      onChange={(e) => setPayNow(e.target.value)}
                      className="h-7 w-24 rounded-md border border-slate-300 bg-white px-1.5 text-right text-xs"
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{blockCopy.payPickup}</span>
                    <span className="font-bold text-slate-900">{payOnPickup || "0"}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                      <span>{blockCopy.deposit}</span>
                      <input
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                        className="h-7 w-24 rounded-md border border-slate-300 bg-white px-1.5 text-right text-xs"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={blockSaving}
                    onClick={() => void saveBlock()}
                    className="mt-1 w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {blockCopy.save}
                  </button>
                  <select
                    value={agent}
                    onChange={(e) => setAgent(e.target.value)}
                    className="h-7 w-full rounded-md border border-slate-300 bg-white px-1.5 text-xs"
                  >
                    <option value="">{blockCopy.noAgent}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setBlockCarId(null)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {blockCopy.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {noticeCar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  {noticeCar.status === "REJECTED"
                    ? locale === "ka"
                      ? "უარყოფილი განცხადება"
                      : locale === "ru"
                        ? "Отклонённое объявление"
                        : "Rejected listing"
                    : locale === "ka"
                      ? "მოდერაციის მოლოდინში"
                      : locale === "ru"
                        ? "Ожидает модерации"
                        : "Awaiting moderation"}
                </p>
                <p className="text-lg font-extrabold text-[#0b1f4b]">
                  {noticeCar.make} {noticeCar.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoticeCar(null)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {locale === "ka"
                  ? "ადმინისტრატორის კომენტარი"
                  : locale === "ru"
                    ? "Комментарий администратора"
                    : "Admin comment"}
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium leading-relaxed text-amber-950">
                {isInsuranceExpiryReason(noticeCar.hiddenReason)
                  ? insuranceExpiryReasonLabel(locale)
                  : (noticeCar.rejectionNote || noticeCar.hiddenReason || "").trim() ||
                    (locale === "ka"
                      ? "განცხადება ჯერ არ არის დამტკიცებული. მწვანე გახდება მხოლოდ ადმინის დამტკიცების შემდეგ."
                      : locale === "ru"
                        ? "Объявление ещё не одобрено. Зелёным станет только после одобрения админом."
                        : "This listing is not approved yet. It turns green only after admin approval.")}
              </div>
              <p className="text-xs text-slate-500">
                {locale === "ka"
                  ? "ფანჯარა დარჩება ყვითელი, სანამ ადმინისტრატორი არ დაამტკიცებს განცხადებას."
                  : locale === "ru"
                    ? "Окно останется жёлтым, пока администратор не одобрит объявление."
                    : "The window stays yellow until an administrator approves the listing."}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setNoticeCar(null)}
                className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700"
              >
                {locale === "ka" ? "დახურვა" : locale === "ru" ? "Закрыть" : "Close"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = noticeCar.id;
                  setNoticeCar(null);
                  router.push(`${PARTNER_BASE}/cars/${id}/edit`);
                }}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-500"
              >
                {locale === "ka" ? "რედაქტირება" : locale === "ru" ? "Редактировать" : "Edit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
