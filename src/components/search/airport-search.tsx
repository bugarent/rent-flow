"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { prefetchFullRoute } from "@/lib/client/prefetch-route";
import { CalendarDays, ChevronDown, ChevronLeft, Clock3, MapPin, Plane, PlaneTakeoff, BadgeCheck, ShieldCheck, Zap } from "lucide-react";
import type { CatalogAirport } from "@/lib/catalog/airports";
import { isCityLocationCode } from "@/lib/catalog/search-places";
import { defaultSearchDateRange } from "@/lib/catalog/default-search-dates";
import { setHomeCountry } from "@/lib/catalog/home-country-store";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { placeLabel, regionName } from "@/lib/i18n/place-label";
import { CountryFlag } from "@/components/ui/country-flag";
import { useSearchOptions } from "@/components/search/use-search-options";
import { usePreferences } from "@/components/providers/preferences-context";
import { CustomBookingStartModal, loadCustomBookingStartModal } from "@/components/layout/lazy-modals";
import { preloadProps } from "@/lib/client/preload";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";
import { clampPickupSelection, earliestPickupIsoDate, isPickupSlotAllowed } from "@/lib/bookings/lead-time";
import {
  SearchDateRangePicker,
  formatRangeDay,
  type DateRangeField,
} from "@/components/search/search-date-range-picker";

export type SearchAirportOption = {
  iata: string;
  label: string;
  country: string;
  countryIso2: string;
  isHub: boolean;
  kind?: "airport" | "city";
  /** Homepage individual-booking banner for this pickup. */
  individualBookingEnabled?: boolean;
  /** Live cars offered at this place; cities list by it, largest fleet first. */
  carCount?: number;
};

/** Airports first (popular rank, then name); cities after, largest fleet first. */
export function compareSearchPlaces(
  a: { label: string; isCity: boolean; rank?: number; carCount?: number },
  b: { label: string; isCity: boolean; rank?: number; carCount?: number },
) {
  if (a.isCity !== b.isCity) return a.isCity ? 1 : -1;
  if (a.isCity) {
    const diff = (b.carCount ?? 0) - (a.carCount ?? 0);
    if (diff) return diff;
  } else {
    const ar = a.rank ?? Number.POSITIVE_INFINITY;
    const br = b.rank ?? Number.POSITIVE_INFINITY;
    if (ar !== br) return ar - br;
  }
  return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
}

export function toSearchOptions(
  airports: CatalogAirport[],
  locale: keyof CatalogAirport["name"],
): SearchAirportOption[] {
  return airports.map((a) => ({
    iata: a.iata,
    label: `${a.name[locale] || a.name.en} (${a.iata})`,
    country: a.countryName[locale] || a.countryName.en,
    countryIso2: a.countryIso2.toUpperCase(),
    isHub: a.isHub,
    kind: "airport",
  }));
}

const SAME_AS_PICKUP = "SAME";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

function FieldShell({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/45 bg-white px-2.5 py-1.5 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.08)] sm:min-h-8 sm:py-1">
      <span className="shrink-0 text-[#1A3B5D]/80">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

type SearchCountry = { iso2: string; name: string };

function countriesFromOptions(options: SearchAirportOption[], locale: string): SearchCountry[] {
  const map = new Map<string, string>();
  for (const option of options) {
    const iso2 = option.countryIso2?.trim().toUpperCase();
    if (!iso2 || iso2.length !== 2) continue;
    if (!map.has(iso2)) {
      map.set(iso2, regionName(locale, iso2, option.country?.trim() || worldCountryName(iso2)));
    }
  }
  return [...map.entries()]
    .map(([iso2, name]) => ({ iso2, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function clampDateToMin(value: string, min: string) {
  if (!value) return min;
  return value < min ? min : value;
}

function DateTimeField({
  dateLabel,
  timeLabel,
  time,
  onOpenCalendar,
  onTimeChange,
  isTimeDisabled,
}: {
  dateLabel: string;
  timeLabel: string;
  time: string;
  onOpenCalendar: () => void;
  onTimeChange: (value: string) => void;
  isTimeDisabled?: (value: string) => boolean;
}) {
  return (
    <FieldShell icon={<CalendarDays className="h-4 w-4" />}>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenCalendar}
          className="min-h-8 min-w-0 flex-1 truncate bg-transparent py-0 text-left text-sm font-medium text-slate-800 outline-none"
        >
          {dateLabel}
        </button>
        <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden />
        <Clock3 className="h-4 w-4 shrink-0 text-[#1A3B5D]/80" aria-hidden />
        <select
          value={time}
          aria-label={timeLabel}
          onChange={(e) => onTimeChange(e.target.value)}
          className="min-h-8 w-[5.25rem] shrink-0 bg-transparent text-sm font-medium text-slate-800 outline-none"
          required
        >
          {TIME_OPTIONS.map((value) => (
            <option key={value} value={value} disabled={isTimeDisabled?.(value)}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  );
}

export type LocationChoice = {
  value: string;
  label: string;
  kind?: "airport" | "city" | "special";
  countryIso2?: string;
  country?: string;
  /** Lower ranks list first within their group (popular airports); unranked sort by label. */
  rank?: number;
  carCount?: number;
};

function isCityChoice(option: LocationChoice) {
  return option.kind === "city" || isCityLocationCode(option.value);
}

function compareLocationChoices(a: LocationChoice, b: LocationChoice) {
  return compareSearchPlaces({ ...a, isCity: isCityChoice(a) }, { ...b, isCity: isCityChoice(b) });
}

function locationMatchesQuery(option: LocationChoice, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const label = option.label.trim().toLowerCase();
  const code = option.value.trim().toLowerCase();
  const country = (option.country || "").trim().toLowerCase();
  const iso2 = (option.countryIso2 || "").trim().toLowerCase();
  if (
    label.startsWith(q) ||
    code.startsWith(q) ||
    label.includes(q) ||
    code.includes(q) ||
    country.includes(q) ||
    iso2 === q
  ) {
    return true;
  }
  return label.split(/[\s·,—\-]+/).some((part) => part.startsWith(q));
}

type CountryLocationGroup = {
  iso2: string;
  name: string;
  airports: LocationChoice[];
  cities: LocationChoice[];
};

function groupLocationsByCountry(options: LocationChoice[]): {
  special: LocationChoice[];
  countries: CountryLocationGroup[];
  ungrouped: LocationChoice[];
} {
  const special: LocationChoice[] = [];
  const ungrouped: LocationChoice[] = [];
  const byIso = new Map<string, CountryLocationGroup>();
  const countryOrder: string[] = [];

  for (const option of options) {
    if (option.kind === "special") {
      special.push(option);
      continue;
    }
    const iso2 = option.countryIso2?.trim().toUpperCase() || "";
    if (iso2.length !== 2) {
      ungrouped.push(option);
      continue;
    }
    let group = byIso.get(iso2);
    if (!group) {
      group = {
        iso2,
        name: option.country?.trim() || worldCountryName(iso2),
        airports: [],
        cities: [],
      };
      byIso.set(iso2, group);
      countryOrder.push(iso2);
    }
    if (isCityChoice(option)) {
      group.cities.push(option);
    } else {
      group.airports.push(option);
    }
  }

  const countries = countryOrder.map((iso2) => {
    const group = byIso.get(iso2)!;
    group.airports.sort(compareLocationChoices);
    group.cities.sort(compareLocationChoices);
    return group;
  });
  return { special, countries, ungrouped };
}

export function LocationPicker({
  options,
  value,
  onChange,
  placeholder,
  required,
  airportsGroup,
  citiesGroup,
  emptyMessage,
  restoreOnClear,
  inputClassName,
  ariaLabel,
  countries,
  onCountrySelect,
  activeIso2 = "",
}: {
  options: LocationChoice[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  required?: boolean;
  airportsGroup?: string;
  citiesGroup?: string;
  emptyMessage?: string;
  /** If the field is left empty after search, restore this value (e.g. same-as-pickup). */
  restoreOnClear?: string;
  inputClassName?: string;
  /** Empty click lists countries; choosing one reveals that country's places. Typing filters places. */
  countries?: SearchCountry[];
  onCountrySelect?: (iso2: string) => void;
  /** Country already chosen. Reopening the field lists its places in this same panel. */
  activeIso2?: string;
}) {
  const { dictionary } = usePreferences();
  const resolvedEmpty = emptyMessage ?? dictionary.home.noLocationsFound;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [browseIso2, setBrowseIso2] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const restoreRef = useRef(restoreOnClear);
  const onChangeRef = useRef(onChange);
  const listId = useId();
  // Country click focuses the field again; that focus must not wipe the place list.
  const holdCountryRef = useRef(false);
  useLayoutEffect(() => {
    valueRef.current = value;
    restoreRef.current = restoreOnClear;
    onChangeRef.current = onChange;
  });
  const selected = options.find((o) => o.value === value);
  const countryStep = Boolean(countries && countries.length > 1);
  const showCountries = countryStep && !browseIso2 && !query.trim();
  const browseCountry = browseIso2 ? (countries?.find((c) => c.iso2 === browseIso2) ?? null) : null;

  const placePool = useMemo(() => {
    if (!browseIso2) return options;
    const iso = browseIso2.toUpperCase();
    return options.filter(
      (option) => option.kind === "special" || (option.countryIso2 || "").toUpperCase() === iso,
    );
  }, [options, browseIso2]);

  const filtered = useMemo(
    () => placePool.filter((option) => locationMatchesQuery(option, query)),
    [placePool, query],
  );

  const grouped = useMemo(() => groupLocationsByCountry(filtered), [filtered]);
  const useCountryGroups = grouped.countries.length > 0;
  const airportFiltered = filtered.filter((o) => o.kind === "airport");
  const cityFiltered = filtered.filter((o) => o.kind === "city");
  const specialFiltered = filtered.filter((o) => o.kind === "special");
  const plainFiltered = filtered.filter((o) => !o.kind);
  const useKindGroups =
    !useCountryGroups &&
    Boolean(airportsGroup && citiesGroup) &&
    airportFiltered.length > 0 &&
    cityFiltered.length > 0;

  const placePanel = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 380), window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const maxHeight = Math.min(420, Math.max(220, Math.max(spaceBelow, spaceAbove) - 12));
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const top = openUp
      ? Math.max(12, rect.top - maxHeight - 8)
      : Math.min(rect.bottom + 6, window.innerHeight - Math.min(maxHeight, spaceBelow) - 12);
    setPanelStyle({
      position: "fixed",
      left,
      width,
      maxHeight,
      zIndex: 250,
      top,
    });
  };

  const closePanel = () => {
    setOpen(false);
    setQuery("");
    setBrowseIso2("");
    if (!valueRef.current && restoreRef.current) onChangeRef.current(restoreRef.current);
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const onReposition = () => placePanel();
    const onPointerDown = (event: MouseEvent) => {
      if (holdCountryRef.current) return;
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-location-panel]")) return;
      setOpen(false);
      setQuery("");
      setBrowseIso2("");
      if (!valueRef.current && restoreRef.current) onChangeRef.current(restoreRef.current);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        setBrowseIso2("");
        if (!valueRef.current && restoreRef.current) onChangeRef.current(restoreRef.current);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayValue = open ? query : selected?.label ?? "";

  const pick = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const renderOption = (option: LocationChoice, flagIso2?: string) => {
    const iso2 = (flagIso2 || option.countryIso2 || "").trim().toUpperCase();
    const isAirport = option.kind === "airport" || (option.kind !== "city" && option.kind !== "special" && !isCityChoice(option));
    return (
      <li key={option.value}>
        <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(option.value)}
          className={`flex min-h-11 w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm leading-snug hover:bg-slate-50 sm:min-h-10 sm:py-1.5 sm:text-xs ${
            option.value === value ? "bg-sky-50 font-semibold text-sky-950" : "font-medium text-slate-800"
          }`}
        >
          {iso2 ? <CountryFlag iso2={iso2} className="h-3 w-4 shrink-0" /> : null}
          <span className="min-w-0 whitespace-normal break-words">
            {option.label}
            {isAirport ? (
              <Plane className="ml-1 inline-block h-3.5 w-3.5 translate-y-[-1px] text-sky-700" aria-hidden />
            ) : null}
          </span>
        </button>
      </li>
    );
  };

  const renderCountryBlocks = () => (
    <>
      {grouped.special.map((option) => renderOption(option))}
      {grouped.countries.map((country) => (
        <Fragment key={`country-${country.iso2}`}>
          {country.airports.map((option) => renderOption(option, country.iso2))}
          {country.cities.map((option) => renderOption(option, country.iso2))}
        </Fragment>
      ))}
      {grouped.ungrouped.map((option) => renderOption(option))}
    </>
  );

  const selectCountry = (iso2: string) => {
    holdCountryRef.current = true;
    setBrowseIso2(iso2);
    setQuery("");
    setOpen(true);
    onCountrySelect?.(iso2);
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      placePanel();
      requestAnimationFrame(() => {
        holdCountryRef.current = false;
      });
    });
  };

  const list =
    open
      ? createPortal(
          <div
            ref={panelRef}
            data-location-panel=""
            className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-2xl"
            style={panelStyle}
          >
            {showCountries ? (
              <ul id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto py-0.5">
                <li className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {dictionary.home.searchCountry}
                </li>
                {countries!.length === 0 ? (
                  <li className="px-2.5 py-2 text-xs text-slate-500">{dictionary.home.noCountriesFound}</li>
                ) : (
                  countries!.map((country) => (
                    <li key={country.iso2}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectCountry(country.iso2);
                        }}
                        onClick={() => selectCountry(country.iso2)}
                        className="flex min-h-11 w-full items-center gap-2 px-2.5 py-2 text-left text-base font-medium text-slate-800 hover:bg-slate-50 sm:min-h-10 sm:text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">{country.name}</span>
                        <CountryFlag iso2={country.iso2} title={country.name} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <>
                {browseCountry ? (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      holdCountryRef.current = true;
                      setBrowseIso2("");
                      setQuery("");
                      requestAnimationFrame(() => {
                        inputRef.current?.focus({ preventScroll: true });
                        holdCountryRef.current = false;
                      });
                    }}
                    className="flex min-h-10 w-full shrink-0 items-center gap-2 border-b border-slate-100 px-2.5 py-1.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4 shrink-0 text-[#e67e22]" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{browseCountry.name}</span>
                    <CountryFlag iso2={browseCountry.iso2} title={browseCountry.name} />
                  </button>
                ) : null}
                <ul id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto py-0.5">
                  {filtered.length === 0 ? (
                    <li className="px-2.5 py-2 text-xs text-slate-500">{resolvedEmpty}</li>
                  ) : useCountryGroups ? (
                    renderCountryBlocks()
                  ) : useKindGroups ? (
                    <>
                      {specialFiltered.map((option) => renderOption(option))}
                      {airportFiltered.length ? (
                        <li className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {airportsGroup}
                        </li>
                      ) : null}
                      {airportFiltered.map((option) => renderOption(option))}
                      {cityFiltered.length ? (
                        <li className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {citiesGroup}
                        </li>
                      ) : null}
                      {cityFiltered.map((option) => renderOption(option))}
                    </>
                  ) : (
                    [...specialFiltered, ...airportFiltered, ...cityFiltered, ...plainFiltered].map(
                      (option) => renderOption(option),
                    )
                  )}
                </ul>
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        required={required && !value}
        onFocus={() => {
          setOpen(true);
          if (holdCountryRef.current) {
            requestAnimationFrame(() => placePanel());
            return;
          }
          const opening = !open;
          setQuery("");
          if (opening && countryStep) setBrowseIso2(activeIso2 || "");
          requestAnimationFrame(() => placePanel());
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onClick={() => {
          setOpen(true);
          placePanel();
        }}
        className={
          inputClassName ||
          "min-h-11 w-full min-w-0 bg-transparent text-base font-semibold text-black caret-[#e67e22] outline-none placeholder:font-semibold placeholder:text-black/85 sm:min-h-8 sm:text-sm"
        }
      />
      <ChevronDown
        className={`h-4 w-4 shrink-0 cursor-pointer transition-transform ${
          open ? "rotate-180 text-[#e67e22]" : "text-[#e67e22]"
        }`}
        strokeWidth={2.75}
        aria-hidden
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (open) {
            closePanel();
            return;
          }
          inputRef.current?.focus();
        }}
      />
      {list}
    </div>
  );
}

export function AirportSearch({
  options: serverOptions,
  onPickupChange,
  customBookingChannels,
  popularIatas = [],
}: {
  options: SearchAirportOption[];
  onPickupChange?: (pickupIata: string) => void;
  customBookingChannels?: CustomBookingChannelsConfig;
  /** Homepage popular airports order — these list first in the selected country. */
  popularIatas?: string[];
}) {
  const router = useRouter();
  const options = useSearchOptions(serverOptions);
  const popularKey = popularIatas.map((code) => code.trim().toUpperCase()).join(",");
  const popularRank = useMemo(() => {
    const map = new Map<string, number>();
    popularKey.split(",").forEach((code, index) => {
      if (code && !map.has(code)) map.set(code, index);
    });
    return map;
  }, [popularKey]);
  const { dictionary, locale } = usePreferences();
  const countries = useMemo(() => countriesFromOptions(options, locale), [options, locale]);
  const locked = countries.length <= 1;
  // Empty until the visitor picks a country or a place; a single-country site needs no choice.
  const [countryIso2, setCountryIso2] = useState(() => (locked ? countries[0]?.iso2 || "" : ""));

  const allLocations = useMemo(() => {
    const rankOf = (o: SearchAirportOption) =>
      popularRank.get(String(o.iata || "").toUpperCase()) ?? Number.POSITIVE_INFINITY;
    const place = (o: SearchAirportOption) => ({
      label: o.label,
      isCity: o.kind === "city" || isCityLocationCode(o.iata),
      rank: rankOf(o),
      carCount: o.carCount,
    });
    return [...options].sort((a, b) => compareSearchPlaces(place(a), place(b)));
  }, [options, popularRank]);

  const locations = useMemo(() => {
    const preferred = countryIso2?.toUpperCase() || "";
    if (!preferred) return allLocations;
    return allLocations.filter((o) => o.countryIso2?.toUpperCase() === preferred);
  }, [allLocations, countryIso2]);

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState(SAME_AS_PICKUP);
  const [minPickupDate, setMinPickupDate] = useState("");
  const [pickupDate, setPickupDate] = useState(() => defaultSearchDateRange().pickupDate);
  const [dropoffDate, setDropoffDate] = useState(() => defaultSearchDateRange().dropoffDate);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffTime, setDropoffTime] = useState("10:00");

  useEffect(() => {
    const slot = clampPickupSelection(pickupDate, pickupTime, TIME_OPTIONS);
    setMinPickupDate(earliestPickupIsoDate());
    setPickupDate(slot.date);
    setPickupTime(slot.time);
    setDropoffDate((current) => (current < slot.date ? slot.date : current));
    // Clock-based lead time is applied after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [customBookingOpen, setCustomBookingOpen] = useState(false);
  const [customBookingMounted, setCustomBookingMounted] = useState(false);
  const [calendarField, setCalendarField] = useState<DateRangeField | null>(null);

  useEffect(() => {
    if (dropoffDate < pickupDate) setDropoffDate(pickupDate);
  }, [pickupDate, dropoffDate]);

  useEffect(() => {
    onPickupChange?.(pickup);
  }, [pickup, onPickupChange]);

  useEffect(() => {
    if (!countries.length) return;
    if (locked && countryIso2 !== countries[0].iso2) {
      setCountryIso2(countries[0].iso2);
      return;
    }
    if (countryIso2 && !countries.some((c) => c.iso2 === countryIso2)) setCountryIso2("");
  }, [countries, countryIso2, locked]);

  // Picking a place first selects its country, so the rest of the page follows it.
  useEffect(() => {
    if (countryIso2 || !pickup) return;
    const iso2 = options.find((o) => o.iata === pickup)?.countryIso2?.toUpperCase();
    if (iso2) setCountryIso2(iso2);
  }, [pickup, countryIso2, options]);

  useEffect(() => {
    setHomeCountry(countryIso2);
  }, [countryIso2]);

  // Keep pickup/dropoff inside the selected country's active locations.
  useEffect(() => {
    const codes = new Set(locations.map((o) => o.iata));
    if (pickup && !codes.has(pickup)) {
      setPickup("");
      setPickupAddress("");
    }
    if (dropoff !== SAME_AS_PICKUP && !codes.has(dropoff)) {
      setDropoff(SAME_AS_PICKUP);
      setDropoffAddress("");
    }
  }, [locations, pickup, dropoff]);

  const pickupOption = options.find((o) => o.iata === pickup);
  const dropoffCode = dropoff === SAME_AS_PICKUP ? pickup : dropoff;
  const dropoffOption = options.find((o) => o.iata === dropoffCode);
  const pickupIsCity = Boolean(
    pickupOption && (pickupOption.kind === "city" || isCityLocationCode(pickupOption.iata)),
  );
  const dropoffIsCity = Boolean(
    dropoffOption && (dropoffOption.kind === "city" || isCityLocationCode(dropoffOption.iata)),
  );
  const airportOptions = locations.filter((o) => o.kind !== "city" && !isCityLocationCode(o.iata));
  const cityOptions = locations.filter((o) => o.kind === "city" || isCityLocationCode(o.iata));
  const useLocationGroups = airportOptions.length > 0 && cityOptions.length > 0;
  const { allLocationChoices, locationChoices } = useMemo(() => {
    const mapOption = (o: SearchAirportOption): LocationChoice => ({
      value: o.iata,
      label: placeLabel(locale, o.label),
      kind:
        o.kind === "city" || isCityLocationCode(o.iata)
          ? "city"
          : o.kind === "airport"
            ? "airport"
            : undefined,
      countryIso2: o.countryIso2,
      country: regionName(locale, o.countryIso2, o.country || worldCountryName(o.countryIso2)),
      rank: isCityLocationCode(o.iata) ? undefined : popularRank.get(String(o.iata || "").toUpperCase()),
      carCount: o.carCount,
    });
    const all = allLocations.map(mapOption);
    const preferred = countryIso2?.toUpperCase() || "";
    const scoped = preferred
      ? all.filter((o) => (o.countryIso2 || "").toUpperCase() === preferred)
      : [];
    return { allLocationChoices: all, locationChoices: scoped };
  }, [allLocations, countryIso2, locale, popularRank]);

  const chooseCountry = (iso2: string) => {
    const next = iso2.trim().toUpperCase();
    if (!next) return;
    setCountryIso2(next);
    const place = options.find((o) => o.iata === pickup);
    if (pickup && place?.countryIso2?.toUpperCase() !== next) {
      setPickup("");
      setPickupAddress("");
    }
  };

  const onPickupPicked = (code: string) => {
    setPickup(code);
    if (!code) {
      setPickupAddress("");
      return;
    }
    const iso2 = options.find((o) => o.iata === code)?.countryIso2?.toUpperCase();
    if (iso2) setCountryIso2(iso2);
  };
  const dropoffChoices = useMemo<LocationChoice[]>(
    () => [
      { value: SAME_AS_PICKUP, label: dictionary.home.sameAsPickup, kind: "special" },
      ...locationChoices,
    ],
    [dictionary.home.sameAsPickup, locationChoices],
  );
  const showIndividualBooking = Boolean(
    pickup && customBookingChannels && pickupOption?.individualBookingEnabled === true,
  );

  useEffect(() => {
    if (!showIndividualBooking) setCustomBookingOpen(false);
  }, [showIndividualBooking]);
  const ctaButtonClass =
    "flex min-h-11 min-w-0 w-full items-center justify-center rounded-lg bg-[#15803d] px-3 py-2.5 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-[0_3px_10px_rgba(21,128,61,0.28)] hover:bg-[#166534] sm:min-h-9 sm:px-4 sm:text-sm";

  /** Results URL for the current form, or null while the trip is incomplete. */
  const searchHref = (): string | null => {
    if (!pickup) return null;
    const safeSlot = clampPickupSelection(pickupDate, pickupTime, TIME_OPTIONS);
    const safePickupDate = safeSlot.date;
    const safeDropoffDate = clampDateToMin(dropoffDate, safePickupDate);
    const safePickupTime = safeSlot.time;
    if (safeDropoffDate === safePickupDate && dropoffTime <= safePickupTime) return null;
    const drop = dropoff === SAME_AS_PICKUP ? pickup : dropoff;
    const startDate = `${safePickupDate}T${safePickupTime}`;
    const endDate = `${safeDropoffDate}T${dropoffTime}`;
    const params = new URLSearchParams({ pickup, dropoff: drop, startDate, endDate, time: safePickupTime });
    if (pickupIsCity && pickupAddress.trim()) params.set("pickupAddress", pickupAddress.trim());
    if (dropoffIsCity && dropoffAddress.trim()) params.set("dropoffAddress", dropoffAddress.trim());
    return `/cars?${params.toString()}`;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const href = searchHref();
    if (href) router.push(href);
  };

  const prefetchSearch = () => {
    const href = searchHref();
    if (href) prefetchFullRoute(router, href);
  };

  const fieldClass =
    "w-full min-w-0 bg-transparent text-sm font-medium text-slate-800 outline-none [appearance:auto]";
  const labelClass =
    "mb-0.5 block text-left text-[11px] font-semibold leading-none text-white [text-shadow:0_1px_2px_rgba(2,6,23,0.7)]";

  return (
    <form
      onSubmit={submit}
      className="box-border w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-white/20 bg-[#0b1f4b]/45 px-3 py-1.5 text-white shadow-xl backdrop-blur-[3px] sm:px-3.5 sm:py-2"
    >
      <ul className="mb-1.5 grid grid-cols-2 gap-1 sm:mb-2 sm:grid-cols-3 sm:gap-1.5">
        {(
          [
            { icon: ShieldCheck, label: dictionary.home.trustFreeCancellation },
            { icon: BadgeCheck, label: dictionary.home.trustNoHiddenFees },
            { icon: Zap, label: dictionary.home.trustInstantConfirmation },
          ] as const
        ).map((item, index) => (
          <li
            key={item.label}
            className={index === 2 ? "col-span-2 justify-self-center sm:col-span-1 sm:justify-self-stretch" : ""}
          >
            <span className="inline-flex h-7 w-full min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white px-2.5 text-[11px] font-semibold tracking-wide text-[#0b1f4b] shadow-[0_1px_2px_rgba(15,23,42,0.12)] sm:h-8 sm:px-3 sm:text-[12px]">
              <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
              <span className="truncate">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{dictionary.home.pickupLocation}</span>
          <FieldShell icon={<PlaneTakeoff className="h-4 w-4" />}>
            <LocationPicker
              options={allLocationChoices}
              value={pickup}
              onChange={onPickupPicked}
              placeholder={dictionary.home.selectPickup}
              ariaLabel={dictionary.home.pickupLocation}
              required
              airportsGroup={useLocationGroups ? dictionary.home.airportsGroup : undefined}
              citiesGroup={useLocationGroups ? dictionary.home.citiesGroup : undefined}
              countries={locked ? undefined : countries}
              onCountrySelect={chooseCountry}
              activeIso2={locked ? "" : countryIso2}
            />
          </FieldShell>
        </label>

        <label className="block">
          <span className={labelClass}>{dictionary.home.dropoffLocation}</span>
          <FieldShell icon={<MapPin className="h-4 w-4" />}>
            <LocationPicker
              options={dropoffChoices}
              value={dropoff}
              onChange={setDropoff}
              placeholder={dictionary.home.sameAsPickup}
              ariaLabel={dictionary.home.dropoffLocation}
              required
              restoreOnClear={SAME_AS_PICKUP}
              airportsGroup={useLocationGroups ? dictionary.home.airportsGroup : undefined}
              citiesGroup={useLocationGroups ? dictionary.home.citiesGroup : undefined}
            />
          </FieldShell>
        </label>

        {pickupIsCity ? (
          <label className="block sm:col-span-2">
            <span className={labelClass}>{dictionary.home.pickupAddress}</span>
            <FieldShell icon={<MapPin className="h-4 w-4" />}>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder={dictionary.home.cityAddressHint}
                className={fieldClass}
              />
            </FieldShell>
          </label>
        ) : null}

        {dropoffIsCity ? (
          <label className="block sm:col-span-2">
            <span className={labelClass}>{dictionary.home.dropoffAddress}</span>
            <FieldShell icon={<MapPin className="h-4 w-4" />}>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder={dictionary.home.cityAddressHint}
                className={fieldClass}
              />
            </FieldShell>
          </label>
        ) : null}

        <label className="block">
          <span className={labelClass}>{dictionary.home.pickupDateShort}</span>
          <DateTimeField
            dateLabel={formatRangeDay(pickupDate, locale)}
            timeLabel={`${dictionary.home.pickupDateShort} — ${pickupTime}`}
            time={pickupTime}
            onOpenCalendar={() => setCalendarField("pickup")}
            isTimeDisabled={(value) => !isPickupSlotAllowed(pickupDate, value)}
            onTimeChange={(value) => {
              if (!isPickupSlotAllowed(pickupDate, value)) return;
              setPickupTime(value);
            }}
          />
        </label>

        <label className="block">
          <span className={labelClass}>{dictionary.home.dropoffDateShort}</span>
          <DateTimeField
            dateLabel={formatRangeDay(dropoffDate, locale)}
            timeLabel={`${dictionary.home.dropoffDateShort} — ${dropoffTime}`}
            time={dropoffTime}
            onOpenCalendar={() => setCalendarField("dropoff")}
            isTimeDisabled={(value) => dropoffDate === pickupDate && value <= pickupTime}
            onTimeChange={setDropoffTime}
          />
        </label>
      </div>

      {calendarField ? (
        <SearchDateRangePicker
          initialField={calendarField}
          pickupDate={pickupDate}
          dropoffDate={dropoffDate}
          minDate={minPickupDate || earliestPickupIsoDate()}
          locale={locale}
          pickupLabel={dictionary.home.pickupDateShort}
          dropoffLabel={dictionary.home.dropoffDateShort}
          closeLabel={dictionary.common.closeMenu}
          onClose={() => setCalendarField(null)}
          onApply={(range) => {
            const slot = clampPickupSelection(range.pickupDate, pickupTime, TIME_OPTIONS);
            setPickupDate(slot.date);
            setPickupTime(slot.time);
            setDropoffDate(clampDateToMin(range.dropoffDate, slot.date));
            setCalendarField(null);
          }}
        />
      ) : null}

      <div className="mt-1.5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          onPointerEnter={prefetchSearch}
          onFocus={prefetchSearch}
          onTouchStart={prefetchSearch}
          className={`${ctaButtonClass} ${showIndividualBooking ? "sm:flex-1" : "sm:max-w-[50%]"}`}
        >
          {dictionary.home.searchCta}
        </button>
        {showIndividualBooking ? (
          <button
            type="button"
            {...preloadProps(loadCustomBookingStartModal)}
            onClick={() => {
              setCustomBookingMounted(true);
              setCustomBookingOpen(true);
            }}
            className={`${ctaButtonClass} sm:flex-1`}
          >
            {dictionary.home.customCta}
          </button>
        ) : null}
      </div>
      {customBookingChannels && customBookingMounted ? (
        <CustomBookingStartModal
          open={customBookingOpen}
          onClose={() => setCustomBookingOpen(false)}
          channels={customBookingChannels}
        />
      ) : null}
    </form>
  );
}
