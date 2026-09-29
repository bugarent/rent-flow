/**
 * Airport-local wall clock ↔ UTC helpers (IANA time zones).
 * Booking pickup/return must be stored as UTC Instant; UI shows airport-local time.
 */

const IANA_TZ =
  /^[A-Za-z_]+(?:\/[A-Za-z0-9_\-+]+)+(?:\/[A-Za-z0-9_\-+]+)?$|^UTC$|^Etc\/[A-Za-z0-9_\-+]+$/;

export const DEFAULT_AIRPORT_TIMEZONE = "Asia/Tbilisi";

export function isValidIanaTimeZone(tz: string): boolean {
  const value = String(tz || "").trim();
  if (!value || value.length > 64) return false;
  if (!IANA_TZ.test(value)) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeIanaTimeZone(tz: string | null | undefined): string {
  const value = String(tz || "").trim();
  return isValidIanaTimeZone(value) ? value : DEFAULT_AIRPORT_TIMEZONE;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Parts of an Instant formatted in a specific IANA zone. */
export function getZonedParts(
  instant: Date | string | number,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const d = instant instanceof Date ? instant : new Date(instant);
  const tz = normalizeIanaTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second || "0"),
  };
}

/**
 * Offset (ms) to add to a UTC timestamp so that the *wall clock* matches `timeZone`
 * for that Instant: local = utc + offset.
 */
export function getTimeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const tz = normalizeIanaTimeZone(timeZone);
  const parts = getZonedParts(utcMs, tz);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - utcMs;
}

/**
 * Interpret YYYY-MM-DD + HH:mm[:ss] as wall time in `timeZone`, return UTC Date.
 * CRITICAL path for booking create/edit — never treat airport local as browser local.
 */
export function airportLocalToUtc(
  dateYmd: string,
  timeHm: string,
  timeZone: string,
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateYmd || "").trim());
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeHm || "").trim());
  if (!dateMatch || !timeMatch) {
    throw new Error("INVALID_LOCAL_DATETIME");
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || "0");
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new Error("INVALID_LOCAL_DATETIME");
  }

  const tz = normalizeIanaTimeZone(timeZone);
  // Initial guess: treat wall clock as UTC, then correct by zone offset (handles DST).
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(utcMs, tz);
    const next = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
    if (next === utcMs) break;
    utcMs = next;
  }
  return new Date(utcMs);
}

/** Format a UTC Instant as airport-local date + time fields for inputs. */
export function utcToAirportLocalInput(
  isoOrDate: string | Date,
  timeZone: string,
  minuteStep = 30,
): { date: string; time: string } {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return { date: "", time: "10:00" };
  const p = getZonedParts(d, timeZone);
  const stepped =
    minuteStep > 0 ? Math.round(p.minute / minuteStep) * minuteStep : p.minute;
  let hour = p.hour;
  let minute = stepped;
  if (minute >= 60) {
    minute = 0;
    hour = (hour + 1) % 24;
  }
  return {
    date: `${p.year}-${pad2(p.month)}-${pad2(p.day)}`,
    time: `${pad2(hour)}:${pad2(minute)}`,
  };
}

/** Human-readable airport-local datetime (en-GB style). */
export function formatAirportLocalDateTime(
  isoOrDate: string | Date,
  timeZone: string,
  locale = "en-GB",
): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone: normalizeIanaTimeZone(timeZone),
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Parse loose booking payloads (ISO, or date+time + airport TZ) into UTC Date. */
export function parseBookingInstant(input: {
  iso?: string | null;
  date?: string | null;
  time?: string | null;
  timeZone: string;
}): Date {
  const iso = String(input.iso || "").trim();
  if (iso) {
    return parseClientBookingInstant(iso, input.timeZone);
  }
  const date = String(input.date || "").trim();
  const time = String(input.time || "10:00").trim() || "10:00";
  if (!date) throw new Error("INVALID_LOCAL_DATETIME");
  return airportLocalToUtc(date, time, input.timeZone);
}

/**
 * Client booking datetime → UTC Instant.
 * - Strings with `Z` or ±offset are absolute (already UTC/offset-aware).
 * - Naive `YYYY-MM-DDTHH:mm` is interpreted in the airport IANA zone.
 */
export function parseClientBookingInstant(raw: string, timeZone: string): Date {
  const s = String(raw || "").trim();
  if (!s) throw new Error("INVALID_LOCAL_DATETIME");
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("INVALID_LOCAL_DATETIME");
    return d;
  }
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2}(?::\d{2})?)/.exec(s);
  if (m) {
    return airportLocalToUtc(m[1]!, m[2]!, timeZone);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("INVALID_LOCAL_DATETIME");
  return d;
}
