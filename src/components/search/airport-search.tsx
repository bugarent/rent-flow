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
import { CalendarDays, ChevronDown, Clock3, Globe, MapPin, PlaneTakeoff, BadgeCheck, ShieldCheck, Zap } from "lucide-react";
import type { CatalogAirport } from "@/lib/catalog/airports";
import { isCityLocationCode } from "@/lib/catalog/search-places";
import { defaultSearchDateRange } from "@/lib/catalog/default-search-dates";
import { setHomeCountry } from "@/lib/catalog/home-country-store";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { placeLabel, regionName } from "@/lib/i18n/place-label";
import { CountryFlag } from "@/components/ui/country-flag";
import { usePreferences } from "@/components/providers/preferences-context";
import { CustomBookingStartModal } from "@/components/landing/custom-booking-start-modal";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";
import { clampPickupSelection, earliestPickupIsoDate, isPickupSlotAllowed } from "@/lib/bookings/lead-time";

export type SearchAirportOption = {
  iata: string;
  label: string;
  country: string;
  countryIso2: string;
  isHub: boolean;
  kind?: "airport" | "city";
  /** Homepage individual-booking banner for this pickup. */
  individualBookingEnabled?: boolean;
};

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
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/45 bg-white/25 px-2.5 py-1.5 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.08)] backdrop-blur-md sm:min-h-8 sm:py-1">
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

function CountryPicker({
  countries,
  value,
  onChange,
  locked,
}: {
  countries: SearchCountry[];
  value: string;
  onChange: (iso2: string) => void;
  locked: boolean;
}) {
  const { dictionary } = usePreferences();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = countries.find((c) => c.iso2 === value) ?? countries[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((country) => {
      const hay = `${country.name} ${country.iso2}`.toLowerCase();
      return hay.includes(q);
    });
  }, [countries, query]);

  const placePanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 260);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const maxHeight = Math.min(340, Math.max(200, Math.max(spaceBelow, spaceAbove) - 16));
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const top = openUp
      ? Math.max(12, rect.top - maxHeight - 8)
      : Math.min(rect.bottom + 8, window.innerHeight - Math.min(maxHeight, spaceBelow) - 12);
    setPanelStyle({
      position: "fixed",
      left,
      width,
      maxHeight,
      zIndex: 250,
      top,
    });
  };

  useEffect(() => {
    if (!open || locked) return;
    setQuery("");
    placePanel();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
      window.scrollTo(scrollX, scrollY);
    });
    const onReposition = () => placePanel();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
  }, [open, locked]);

  if (!selected) return null;

  const list =
    open && !locked
      ? createPortal(
          <div
            ref={panelRef}
            className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-2xl"
            style={panelStyle}
          >
            <div className="shrink-0 border-b border-emerald-200/80 bg-emerald-50 p-2">
              <input
                ref={searchRef}
                type="text"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={(e) => e.currentTarget.focus({ preventScroll: true })}
                placeholder={dictionary.home.searchCountryPlaceholder}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-md border border-emerald-300 bg-emerald-100/80 px-3 py-2 text-sm font-medium text-emerald-950 outline-none placeholder:text-emerald-700/70 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-300/60"
                aria-label={dictionary.home.searchCountryPlaceholder}
              />
            </div>
            <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-500">{dictionary.home.noCountriesFound}</li>
              ) : (
                filtered.map((country) => (
                  <li key={country.iso2}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={country.iso2 === value}
                      onClick={() => {
                        onChange(country.iso2);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                        country.iso2 === value ? "bg-sky-50 font-semibold text-sky-950" : "text-slate-800"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{country.name}</span>
                      <CountryFlag iso2={country.iso2} title={country.name} />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!locked) setOpen((prev) => !prev);
        }}
        className="flex min-h-8 w-full items-center gap-2 bg-transparent text-sm font-medium text-slate-800 outline-none disabled:cursor-default"
      >
        <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Globe className="h-4 w-4 shrink-0 text-[#1A3B5D]/80" />
          <span className="truncate">{selected.name}</span>
          <CountryFlag iso2={selected.iso2} title={selected.name} />
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${
            open ? "rotate-180 text-[#e67e22]" : "text-[#e67e22]"
          }`}
          strokeWidth={2.75}
          aria-hidden
        />
      </button>
      {list}
    </div>
  );
}

function clampDateToMin(value: string, min: string) {
  if (!value) return min;
  return value < min ? min : value;
}

function DateTimeField({
  date,
  time,
  min,
  onDateChange,
  onTimeChange,
  isTimeDisabled,
}: {
  date: string;
  time: string;
  min?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  isTimeDisabled?: (value: string) => boolean;
}) {
  return (
    <FieldShell icon={<CalendarDays className="h-4 w-4" />}>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
        <input
          type="date"
          value={date}
          min={min}
          onChange={(e) =>
            onDateChange(min ? clampDateToMin(e.target.value, min) : e.target.value)
          }
          className="min-h-8 min-w-[9.75rem] flex-1 bg-transparent py-0 pl-0 pr-0.5 text-sm font-medium text-slate-800 outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:ms-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit-text]:px-0.5 [&::-webkit-datetime-edit-month-field]:p-0 [&::-webkit-datetime-edit-day-field]:p-0 [&::-webkit-datetime-edit-year-field]:p-0"
          required
        />
        <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden />
        <Clock3 className="h-4 w-4 shrink-0 text-[#1A3B5D]/80" aria-hidden />
        <select
          value={time}
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
};

function compareLocationChoices(a: LocationChoice, b: LocationChoice) {
  const ar = a.rank ?? Number.POSITIVE_INFINITY;
  const br = b.rank ?? Number.POSITIVE_INFINITY;
  if (ar !== br) return ar - br;
  return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
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
    if (option.kind === "city" || isCityLocationCode(option.value)) {
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
}: {
  options: LocationChoice[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  airportsGroup?: string;
  citiesGroup?: string;
  emptyMessage?: string;
  /** If the field is left empty after search, restore this value (e.g. same-as-pickup). */
  restoreOnClear?: string;
  inputClassName?: string;
}) {
  const { dictionary } = usePreferences();
  const resolvedEmpty = emptyMessage ?? dictionary.home.noLocationsFound;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const restoreRef = useRef(restoreOnClear);
  const onChangeRef = useRef(onChange);
  const listId = useId();
  useLayoutEffect(() => {
    valueRef.current = value;
    restoreRef.current = restoreOnClear;
    onChangeRef.current = onChange;
  });
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(
    () => options.filter((option) => locationMatchesQuery(option, query)),
    [options, query],
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
    if (!valueRef.current && restoreRef.current) onChangeRef.current(restoreRef.current);
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const onReposition = () => placePanel();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
      if (!valueRef.current && restoreRef.current) onChangeRef.current(restoreRef.current);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
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
    return (
      <li key={option.value}>
        <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(option.value)}
          className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs leading-snug hover:bg-slate-50 ${
            option.value === value ? "bg-sky-50 font-semibold text-sky-950" : "font-medium text-slate-800"
          }`}
        >
          {iso2 ? <CountryFlag iso2={iso2} className="h-3 w-4 shrink-0" /> : null}
          <span className="min-w-0 flex-1 whitespace-normal break-words">{option.label}</span>
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

  const list =
    open
      ? createPortal(
          <div
            ref={panelRef}
            className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-2xl"
            style={panelStyle}
          >
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
        aria-expanded={open}
        aria-controls={listId}
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
          setQuery("");
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
          "min-h-8 w-full min-w-0 bg-transparent text-sm font-semibold text-black caret-[#e67e22] outline-none placeholder:font-semibold placeholder:text-black/85"
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
  options,
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
  const defaultCountry =
    options.find((o) => o.iata === "KUT")?.countryIso2?.toUpperCase() || countries[0]?.iso2 || "";
  const [countryIso2, setCountryIso2] = useState(defaultCountry);

  const locations = useMemo(() => {
    const preferred = countryIso2?.toUpperCase() || "";
    const filtered = preferred
      ? options.filter((o) => o.countryIso2?.toUpperCase() === preferred)
      : options;
    const rankOf = (o: SearchAirportOption) =>
      popularRank.get(String(o.iata || "").toUpperCase()) ?? Number.POSITIVE_INFINITY;
    return [...filtered].sort((a, b) => {
      const aCity = a.kind === "city" || isCityLocationCode(a.iata) ? 1 : 0;
      const bCity = b.kind === "city" || isCityLocationCode(b.iata) ? 1 : 0;
      if (aCity !== bCity) return aCity - bCity;
      const ar = rankOf(a);
      const br = rankOf(b);
      if (ar !== br) return ar - br;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
  }, [options, countryIso2, popularRank]);

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

  useEffect(() => {
    if (dropoffDate < pickupDate) setDropoffDate(pickupDate);
  }, [pickupDate, dropoffDate]);

  useEffect(() => {
    onPickupChange?.(pickup);
  }, [pickup, onPickupChange]);

  useEffect(() => {
    if (!countries.length) return;
    if (!countries.some((c) => c.iso2 === countryIso2)) {
      setCountryIso2(countries[0].iso2);
    }
  }, [countries, countryIso2]);

  useEffect(() => {
    setHomeCountry(countryIso2);
  }, [countryIso2]);

  // Keep pickup/dropoff inside the selected country's active locations.
  useEffect(() => {
    const codes = new Set(locations.map((o) => o.iata));
    if (pickup && !codes.has(pickup)) {
      setPickup(locations[0]?.iata || "");
      setPickupAddress("");
    }
    if (dropoff !== SAME_AS_PICKUP && !codes.has(dropoff)) {
      setDropoff(SAME_AS_PICKUP);
      setDropoffAddress("");
    }
  }, [locations, pickup, dropoff]);

  const pickupOption = locations.find((o) => o.iata === pickup);
  const dropoffCode = dropoff === SAME_AS_PICKUP ? pickup : dropoff;
  const dropoffOption = locations.find((o) => o.iata === dropoffCode);
  const pickupIsCity = Boolean(
    pickupOption && (pickupOption.kind === "city" || isCityLocationCode(pickupOption.iata)),
  );
  const dropoffIsCity = Boolean(
    dropoffOption && (dropoffOption.kind === "city" || isCityLocationCode(dropoffOption.iata)),
  );
  const airportOptions = locations.filter((o) => o.kind !== "city" && !isCityLocationCode(o.iata));
  const cityOptions = locations.filter((o) => o.kind === "city" || isCityLocationCode(o.iata));
  const useLocationGroups = airportOptions.length > 0 && cityOptions.length > 0;
  const locationChoices = useMemo<LocationChoice[]>(() => {
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
    });
    return locations.map(mapOption);
  }, [locations, locale, popularRank]);
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
    "flex min-h-11 min-w-0 w-full items-center justify-center rounded-lg bg-[#22c55e] px-3 py-2.5 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-[0_3px_10px_rgba(34,197,94,0.28)] hover:bg-[#16a34a] sm:min-h-9 sm:px-4 sm:text-sm";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup) return;
    const safeSlot = clampPickupSelection(pickupDate, pickupTime, TIME_OPTIONS);
    const safePickupDate = safeSlot.date;
    const safeDropoffDate = clampDateToMin(dropoffDate, safePickupDate);
    const safePickupTime = safeSlot.time;
    if (safeDropoffDate === safePickupDate && dropoffTime <= safePickupTime) return;
    const drop = dropoff === SAME_AS_PICKUP ? pickup : dropoff;
    const startDate = `${safePickupDate}T${safePickupTime}`;
    const endDate = `${safeDropoffDate}T${dropoffTime}`;
    const params = new URLSearchParams({ pickup, dropoff: drop, startDate, endDate, time: safePickupTime });
    if (pickupIsCity && pickupAddress.trim()) params.set("pickupAddress", pickupAddress.trim());
    if (dropoffIsCity && dropoffAddress.trim()) params.set("dropoffAddress", dropoffAddress.trim());
    router.push(`/cars?${params.toString()}`);
  };

  const fieldClass =
    "w-full min-w-0 bg-transparent text-sm font-medium text-slate-800 outline-none [appearance:auto]";
  const labelClass = "mb-0.5 block text-left text-[11px] font-semibold leading-none text-white/85";

  return (
    <form
      onSubmit={submit}
      className="box-border w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-white/12 bg-[#0b1f4b]/72 px-3 py-1.5 text-white shadow-xl backdrop-blur-md sm:px-3.5 sm:py-2"
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
            <span className="inline-flex h-7 w-full min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-2.5 text-[11px] font-semibold tracking-wide text-[#0b1f4b] shadow-[0_1px_2px_rgba(15,23,42,0.12)] sm:h-8 sm:px-3 sm:text-[12px]">
              <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
              <span className="truncate">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>

      <h1 className="mb-1 text-center text-sm font-extrabold uppercase tracking-wide text-white sm:text-base md:text-lg">
        {dictionary.home.searchTitle}
      </h1>

      {countries.length > 0 ? (
        <div className="mb-1.5 flex flex-col gap-1 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,50%)_minmax(0,1fr)] sm:items-center sm:gap-x-2">
          <span className="text-left text-[11px] font-semibold leading-none text-white/85 sm:justify-self-start sm:whitespace-nowrap">
            {dictionary.home.searchCountry}
          </span>
          <div className="min-w-0 w-full">
            <div className="min-h-11 rounded-lg border border-white/45 bg-white/25 px-2.5 py-1.5 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.08)] backdrop-blur-md sm:min-h-8 sm:py-1">
              <CountryPicker
                countries={countries}
                value={countryIso2}
                onChange={setCountryIso2}
                locked={locked}
              />
            </div>
          </div>
          <div className="hidden sm:block" aria-hidden="true" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{dictionary.home.pickupLocation}</span>
          <FieldShell icon={<PlaneTakeoff className="h-4 w-4" />}>
            <LocationPicker
              options={locationChoices}
              value={pickup}
              onChange={setPickup}
              placeholder={dictionary.home.selectPickup}
              required
              airportsGroup={useLocationGroups ? dictionary.home.airportsGroup : undefined}
              citiesGroup={useLocationGroups ? dictionary.home.citiesGroup : undefined}
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
            date={pickupDate}
            time={pickupTime}
            min={minPickupDate}
            isTimeDisabled={(value) => !isPickupSlotAllowed(pickupDate, value)}
            onDateChange={(value) => {
              const slot = clampPickupSelection(clampDateToMin(value, minPickupDate), pickupTime, TIME_OPTIONS);
              setPickupDate(slot.date);
              setPickupTime(slot.time);
              if (dropoffDate < slot.date) setDropoffDate(slot.date);
            }}
            onTimeChange={(value) => {
              if (!isPickupSlotAllowed(pickupDate, value)) return;
              setPickupTime(value);
            }}
          />
        </label>

        <label className="block">
          <span className={labelClass}>{dictionary.home.dropoffDateShort}</span>
          <DateTimeField
            date={dropoffDate}
            time={dropoffTime}
            min={pickupDate || minPickupDate}
            isTimeDisabled={(value) => dropoffDate === pickupDate && value <= pickupTime}
            onDateChange={(value) =>
              setDropoffDate(clampDateToMin(value, pickupDate || minPickupDate))
            }
            onTimeChange={setDropoffTime}
          />
        </label>
      </div>

      <div className="mt-1.5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          className={`${ctaButtonClass} ${showIndividualBooking ? "sm:flex-1" : "sm:max-w-[50%]"}`}
        >
          {dictionary.home.searchCta}
        </button>
        {showIndividualBooking ? (
          <button
            type="button"
            onClick={() => setCustomBookingOpen(true)}
            className={`${ctaButtonClass} sm:flex-1`}
          >
            {dictionary.home.customCta}
          </button>
        ) : null}
      </div>
      {customBookingChannels ? (
        <CustomBookingStartModal
          open={customBookingOpen}
          onClose={() => setCustomBookingOpen(false)}
          channels={customBookingChannels}
        />
      ) : null}
    </form>
  );
}
