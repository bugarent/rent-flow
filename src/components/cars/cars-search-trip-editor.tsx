"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, MapPin } from "lucide-react";
import {
  LocationPicker,
  type LocationChoice,
  type SearchAirportOption,
} from "@/components/search/airport-search";
import { isCityLocationCode } from "@/lib/catalog/search-places";
import { usePreferences } from "@/components/providers/preferences-context";
import { cn } from "@/lib/utils";
import { clampPickupSelection, earliestPickupIsoDate, isPickupSlotAllowed } from "@/lib/bookings/lead-time";

const SAME_AS_PICKUP = "SAME";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

function splitDateTime(value: string): { date: string; time: string } {
  const raw = String(value || "").trim();
  if (!raw) return { date: "", time: "10:00" };
  const [datePart = "", timePart = "10:00"] = raw.includes("T") ? raw.split("T") : [raw, "10:00"];
  const time = timePart.slice(0, 5) || "10:00";
  return { date: datePart.slice(0, 10), time };
}

function clampDateToMin(value: string, min: string) {
  if (!value) return min;
  return value < min ? min : value;
}

function ChipShell({
  icon,
  hint,
  children,
  className,
}: {
  icon: ReactNode;
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-lg border border-sky-200/80 bg-[#e8f1fb] px-1.5 py-1.5 text-sm text-slate-800",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-[#1d6fe8]">{icon}</span>
        <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {hint}
        </span>
      </div>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}

const fieldClass =
  "w-full min-w-0 rounded-md border border-sky-200/70 bg-[#f4f9fd] px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#1d6fe8]";

/** Compact date input: kill browser left padding so full MM/DD/YYYY fits. */
const dateFieldClass =
  "min-h-[1.875rem] w-full min-w-0 flex-1 rounded-md sm:w-auto border border-sky-200/70 bg-[#f4f9fd] py-1 pl-0.5 pr-0 text-xs font-semibold text-slate-800 outline-none focus:border-[#1d6fe8] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:ms-0 [&::-webkit-calendar-picker-indicator]:scale-90 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit-text]:px-0.5 [&::-webkit-datetime-edit-month-field]:p-0 [&::-webkit-datetime-edit-day-field]:p-0 [&::-webkit-datetime-edit-year-field]:p-0";

const timeFieldClass =
  "h-[1.875rem] w-full shrink-0 rounded-md sm:w-[4.5rem] border border-sky-200/70 bg-[#f4f9fd] px-1 text-xs font-semibold text-slate-800 outline-none focus:border-[#1d6fe8]";

const locationInputClass =
  "min-h-7 w-full min-w-0 truncate bg-transparent text-xs font-semibold text-slate-800 caret-[#1d6fe8] outline-none placeholder:font-medium placeholder:text-slate-400";

const locationBoxClass = "rounded-md border border-sky-200/70 bg-[#f4f9fd] px-1.5 py-0.5";

function buildCarsSearchQuery(input: {
  pickup: string;
  dropoff: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  category?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupIsCity?: boolean;
  dropoffIsCity?: boolean;
  /** Country-wide browse (category link from home) while no pickup is chosen yet. */
  country?: string;
}): string | null {
  const { pickup, pickupDate, dropoffDate, pickupTime, dropoffTime } = input;
  const country = input.country?.trim().toUpperCase() || "";
  if ((!pickup && !country) || !pickupDate || !dropoffDate) return null;
  const slot = clampPickupSelection(pickupDate, pickupTime, TIME_OPTIONS);
  const safePickupDate = slot.date;
  const safeDropoffDate = clampDateToMin(dropoffDate, safePickupDate);
  if (safeDropoffDate === safePickupDate && dropoffTime <= slot.time) return null;

  if (!pickup) {
    const params = new URLSearchParams({
      country,
      startDate: `${safePickupDate}T${slot.time}`,
      endDate: `${safeDropoffDate}T${dropoffTime}`,
      time: slot.time,
    });
    if (input.category?.trim()) params.set("category", input.category.trim());
    return params.toString();
  }

  const resolvedDropoff = input.dropoff === SAME_AS_PICKUP ? pickup : input.dropoff;
  const params = new URLSearchParams({
    pickup,
    dropoff: resolvedDropoff,
    startDate: `${safePickupDate}T${slot.time}`,
    endDate: `${safeDropoffDate}T${dropoffTime}`,
    time: slot.time,
  });
  if (input.category?.trim()) params.set("category", input.category.trim());
  if (input.pickupIsCity && input.pickupAddress?.trim()) {
    params.set("pickupAddress", input.pickupAddress.trim());
  }
  if (input.dropoffIsCity && input.dropoffAddress?.trim()) {
    params.set("dropoffAddress", input.dropoffAddress.trim());
  }
  return params.toString();
}

export function CarsSearchTripEditor({
  options,
  pickup: initialPickup,
  dropoff: initialDropoff,
  startDate: initialStart,
  endDate: initialEnd,
  pickupAddress: initialPickupAddress = "",
  dropoffAddress: initialDropoffAddress = "",
  category,
  country = "",
  filtersSlot,
}: {
  options: SearchAirportOption[];
  country?: string;
  pickup: string;
  dropoff: string;
  startDate: string;
  endDate: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  category?: string;
  filtersSlot?: ReactNode;
}) {
  const router = useRouter();
  const { dictionary } = usePreferences();
  const [minPickupDate, setMinPickupDate] = useState("");
  const start = splitDateTime(initialStart);
  const end = splitDateTime(initialEnd);
  const syncingFromUrl = useRef(false);

  const [pickup, setPickup] = useState(initialPickup);
  const [dropoff, setDropoff] = useState(
    initialDropoff && initialDropoff !== initialPickup ? initialDropoff : SAME_AS_PICKUP,
  );
  const [pickupDate, setPickupDate] = useState(start.date);
  const [dropoffDate, setDropoffDate] = useState(() => (end.date < start.date ? start.date : end.date));
  const [pickupTime, setPickupTime] = useState(start.time);
  const [dropoffTime, setDropoffTime] = useState(end.time);
  const [pickupAddress, setPickupAddress] = useState(initialPickupAddress);
  const [dropoffAddress, setDropoffAddress] = useState(initialDropoffAddress);

  useEffect(() => {
    const slot = clampPickupSelection(pickupDate || earliestPickupIsoDate(), pickupTime, TIME_OPTIONS);
    setMinPickupDate(earliestPickupIsoDate());
    setPickupDate(slot.date);
    setPickupTime(slot.time);
    setDropoffDate((current) => (current < slot.date ? slot.date : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncingFromUrl.current = true;
    const today = earliestPickupIsoDate();
    setPickup(initialPickup);
    setDropoff(
      initialDropoff && initialDropoff !== initialPickup ? initialDropoff : SAME_AS_PICKUP,
    );
    const nextStart = splitDateTime(initialStart);
    const nextEnd = splitDateTime(initialEnd);
    const slot = clampPickupSelection(clampDateToMin(nextStart.date, today), nextStart.time, TIME_OPTIONS);
    const nextPickup = slot.date;
    setPickupDate(nextPickup);
    setPickupTime(slot.time);
    setDropoffDate(clampDateToMin(nextEnd.date, nextPickup));
    setDropoffTime(nextEnd.time);
    setPickupAddress(initialPickupAddress);
    setDropoffAddress(initialDropoffAddress);
    const t = window.setTimeout(() => {
      syncingFromUrl.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [
    initialPickup,
    initialDropoff,
    initialStart,
    initialEnd,
    initialPickupAddress,
    initialDropoffAddress,
  ]);

  useEffect(() => {
    if (dropoffDate < pickupDate) setDropoffDate(pickupDate);
  }, [pickupDate, dropoffDate]);

  const activeCountryIso2 = useMemo(() => {
    const code = (pickup || initialPickup || "").trim().toUpperCase();
    if (!code) return country.trim().toUpperCase();
    const match = options.find((o) => o.iata.toUpperCase() === code);
    return match?.countryIso2?.trim().toUpperCase() || country.trim().toUpperCase();
  }, [options, pickup, initialPickup, country]);

  const { pickupChoices, dropoffChoices, useLocationGroups } = useMemo(() => {
    const preferred = activeCountryIso2;
    const scoped = preferred
      ? options.filter((o) => o.countryIso2?.toUpperCase() === preferred)
      : options;

    const map = new Map<string, LocationChoice>();
    for (const o of scoped) {
      map.set(o.iata, {
        value: o.iata,
        label: o.label,
        kind: o.kind ?? (isCityLocationCode(o.iata) ? "city" : "airport"),
        countryIso2: o.countryIso2,
        country: o.country,
      });
    }
    const ensure = (code: string) => {
      const value = code.trim();
      if (!value || map.has(value) || value === SAME_AS_PICKUP) return;
      const fromAll = options.find((o) => o.iata === value);
      if (
        preferred &&
        fromAll?.countryIso2?.toUpperCase() &&
        fromAll.countryIso2.toUpperCase() !== preferred
      ) {
        return;
      }
      map.set(value, {
        value,
        label: fromAll?.label || value,
        kind: fromAll?.kind ?? (isCityLocationCode(value) ? "city" : "airport"),
        countryIso2: fromAll?.countryIso2,
        country: fromAll?.country,
      });
    };
    ensure(pickup);
    ensure(initialPickup);
    if (dropoff !== SAME_AS_PICKUP) ensure(dropoff);
    ensure(initialDropoff);

    const all = [...map.values()].sort((a, b) => {
      const aCity = a.kind === "city" ? 1 : 0;
      const bCity = b.kind === "city" ? 1 : 0;
      if (aCity !== bCity) return aCity - bCity;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
    const airports = all.filter((o) => o.kind === "airport");
    const cities = all.filter((o) => o.kind === "city");
    const grouped = airports.length > 0 && cities.length > 0;
    return {
      pickupChoices: all,
      dropoffChoices: [
        { value: SAME_AS_PICKUP, label: dictionary.home.sameAsPickup, kind: "special" as const },
        ...all,
      ],
      useLocationGroups: grouped,
    };
  }, [
    options,
    activeCountryIso2,
    pickup,
    dropoff,
    initialPickup,
    initialDropoff,
    dictionary.home.sameAsPickup,
  ]);

  useEffect(() => {
    if (dropoff === SAME_AS_PICKUP || !activeCountryIso2) return;
    const codes = new Set(pickupChoices.map((o) => o.value));
    if (!codes.has(dropoff)) {
      setDropoff(SAME_AS_PICKUP);
      setDropoffAddress("");
    }
  }, [dropoff, activeCountryIso2, pickupChoices]);

  const pickupOption = pickupChoices.find((o) => o.value === pickup);
  const resolvedDropoff = dropoff === SAME_AS_PICKUP ? pickup : dropoff;
  const dropoffOption = pickupChoices.find((o) => o.value === resolvedDropoff);
  const pickupIsCity = Boolean(
    pickupOption && (pickupOption.kind === "city" || isCityLocationCode(pickupOption.value)),
  );
  const dropoffIsCity = Boolean(
    dropoffOption && (dropoffOption.kind === "city" || isCityLocationCode(dropoffOption.value)),
  );

  const draftQuery = useMemo(
    () =>
      buildCarsSearchQuery({
        pickup,
        dropoff,
        pickupDate,
        dropoffDate,
        pickupTime,
        dropoffTime,
        category,
        pickupAddress,
        dropoffAddress,
        pickupIsCity,
        dropoffIsCity,
        country,
      }),
    [
      country,
      pickup,
      dropoff,
      pickupDate,
      dropoffDate,
      pickupTime,
      dropoffTime,
      category,
      pickupAddress,
      dropoffAddress,
      pickupIsCity,
      dropoffIsCity,
    ],
  );

  const urlQuery = useMemo(() => {
    const startParts = splitDateTime(initialStart);
    const endParts = splitDateTime(initialEnd);
    const slot = clampPickupSelection(startParts.date, startParts.time, TIME_OPTIONS);
    const safePickup = slot.date;
    const dropRaw =
      initialDropoff && initialDropoff !== initialPickup ? initialDropoff : SAME_AS_PICKUP;
    const urlPickupIsCity = (() => {
      const opt = options.find((o) => o.iata === initialPickup);
      return Boolean(opt && (opt.kind === "city" || isCityLocationCode(initialPickup)));
    })();
    const resolvedUrlDropoff = dropRaw === SAME_AS_PICKUP ? initialPickup : dropRaw;
    const urlDropoffIsCity = (() => {
      const opt = options.find((o) => o.iata === resolvedUrlDropoff);
      return Boolean(opt && (opt.kind === "city" || isCityLocationCode(resolvedUrlDropoff)));
    })();
    return buildCarsSearchQuery({
      pickup: initialPickup,
      dropoff: dropRaw,
      pickupDate: safePickup,
      dropoffDate: clampDateToMin(endParts.date, safePickup),
      pickupTime: slot.time,
      dropoffTime: endParts.time,
      category,
      pickupAddress: initialPickupAddress,
      dropoffAddress: initialDropoffAddress,
      pickupIsCity: urlPickupIsCity,
      dropoffIsCity: urlDropoffIsCity,
      country,
    });
  }, [
    country,
    initialPickup,
    initialDropoff,
    initialStart,
    initialEnd,
    initialPickupAddress,
    initialDropoffAddress,
    category,
    options,
  ]);

  useEffect(() => {
    if (syncingFromUrl.current) return;
    if (!draftQuery || draftQuery === urlQuery) return;
    const timer = window.setTimeout(() => {
      router.push(`/cars?${draftQuery}`);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftQuery, urlQuery, router]);

  return (
    <div className="space-y-2 rounded-xl border border-sky-200 bg-[#f3f8fc] px-2 py-2 shadow-sm">
      <div className="grid grid-cols-2 gap-1.5 pb-0.5 sm:flex sm:flex-nowrap sm:items-end sm:overflow-x-auto sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
        <ChipShell
          icon={<Car className="h-3 w-3" />}
          hint={dictionary.home.pickupLocation}
          className="sm:min-w-[12.5rem] sm:flex-1 sm:basis-0"
        >
          <div className={locationBoxClass}>
            <LocationPicker
              options={pickupChoices}
              value={pickup}
              onChange={(value) => {
                setPickup(value);
                if (!value) setPickupAddress("");
              }}
              placeholder={dictionary.home.selectPickup}
              required
              airportsGroup={useLocationGroups ? dictionary.home.airportsGroup : undefined}
              citiesGroup={useLocationGroups ? dictionary.home.citiesGroup : undefined}
              inputClassName={locationInputClass}
            />
          </div>
        </ChipShell>

        <ChipShell
          icon={<MapPin className="h-3 w-3" />}
          hint={dictionary.home.dropoffLocation}
          className="sm:min-w-[12.5rem] sm:flex-1 sm:basis-0"
        >
          <div className={locationBoxClass}>
            <LocationPicker
              options={dropoffChoices}
              value={dropoff}
              onChange={(value) => {
                setDropoff(value || SAME_AS_PICKUP);
                if (!value || value === SAME_AS_PICKUP) setDropoffAddress("");
              }}
              placeholder={dictionary.home.sameAsPickup}
              required
              restoreOnClear={SAME_AS_PICKUP}
              airportsGroup={useLocationGroups ? dictionary.home.airportsGroup : undefined}
              citiesGroup={useLocationGroups ? dictionary.home.citiesGroup : undefined}
              inputClassName={locationInputClass}
            />
          </div>
        </ChipShell>

        <ChipShell
          icon={<CalendarDays className="h-3 w-3" />}
          hint={dictionary.home.pickupDateShort}
          className="sm:min-w-[12.5rem] sm:flex-1 sm:basis-0"
        >
          <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:flex-nowrap sm:items-center">
            <input
              type="date"
              value={pickupDate}
              min={minPickupDate}
              onChange={(e) => {
                const slot = clampPickupSelection(
                  clampDateToMin(e.target.value, minPickupDate),
                  pickupTime,
                  TIME_OPTIONS,
                );
                setPickupDate(slot.date);
                setPickupTime(slot.time);
                if (dropoffDate < slot.date) setDropoffDate(slot.date);
              }}
              className={dateFieldClass}
              required
            />
            <select
              value={pickupTime}
              onChange={(e) => {
                if (!isPickupSlotAllowed(pickupDate, e.target.value)) return;
                setPickupTime(e.target.value);
              }}
              className={timeFieldClass}
              required
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t} disabled={!isPickupSlotAllowed(pickupDate, t)}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </ChipShell>

        <ChipShell
          icon={<CalendarDays className="h-3 w-3" />}
          hint={dictionary.home.dropoffDateShort}
          className="sm:min-w-[12.5rem] sm:flex-1 sm:basis-0"
        >
          <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:flex-nowrap sm:items-center">
            <input
              type="date"
              value={dropoffDate}
              min={pickupDate || minPickupDate}
              onChange={(e) =>
                setDropoffDate(clampDateToMin(e.target.value, pickupDate || minPickupDate))
              }
              className={dateFieldClass}
              required
            />
            <select
              value={dropoffTime}
              onChange={(e) => setDropoffTime(e.target.value)}
              className={timeFieldClass}
              required
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t} disabled={dropoffDate === pickupDate && t <= pickupTime}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </ChipShell>

        {filtersSlot ? (
          <div className="col-span-2 flex items-center gap-1.5 [&>button]:w-full [&>button]:justify-center sm:shrink-0 sm:self-end sm:pb-0.5 sm:[&>button]:w-auto">
            {filtersSlot}
          </div>
        ) : null}
      </div>

      {pickupIsCity || dropoffIsCity ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {pickupIsCity ? (
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {dictionary.home.pickupAddress}
              </span>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder={dictionary.home.cityAddressHint}
                className={fieldClass}
              />
            </label>
          ) : null}
          {dropoffIsCity ? (
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {dictionary.home.dropoffAddress}
              </span>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder={dictionary.home.cityAddressHint}
                className={fieldClass}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
