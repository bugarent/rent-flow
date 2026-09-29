/** New bookings must start at least this far ahead of the current clock. */
export const MIN_BOOKING_LEAD_MS = 2 * 60 * 60 * 1000;

export function localIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function earliestPickupDate(now = new Date()) {
  return new Date(now.getTime() + MIN_BOOKING_LEAD_MS);
}

/** First calendar day that can still host a pickup (local clock). */
export function earliestPickupIsoDate(now = new Date()) {
  return localIsoDate(earliestPickupDate(now));
}

/** Value for `<input type="datetime-local" min>`. */
export function earliestPickupLocalInput(now = new Date()) {
  const d = earliestPickupDate(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDateTimeMs(dateIso: string, timeHHmm: string) {
  const [y, mo, d] = dateIso.split("-").map(Number);
  const [h, mi] = timeHHmm.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return NaN;
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
}

export function isPickupSlotAllowed(dateIso: string, timeHHmm: string, now = new Date()) {
  const ms = localDateTimeMs(dateIso, timeHHmm);
  return Number.isFinite(ms) && ms >= now.getTime() + MIN_BOOKING_LEAD_MS;
}

/** Absolute instant (already resolved to UTC) is too soon to book. */
export function pickupInstantTooSoon(pickupAt: Date, now = new Date()) {
  return !Number.isFinite(pickupAt.getTime()) || pickupAt.getTime() < now.getTime() + MIN_BOOKING_LEAD_MS;
}

export function clampPickupSelection(
  dateIso: string,
  timeHHmm: string,
  options: readonly string[],
  now = new Date(),
) {
  let date = dateIso && dateIso >= earliestPickupIsoDate(now) ? dateIso : earliestPickupIsoDate(now);
  let time = timeHHmm;
  if (!isPickupSlotAllowed(date, time, now)) {
    const next = options.find((slot) => isPickupSlotAllowed(date, slot, now));
    if (next) {
      time = next;
    } else {
      const [y, mo, d] = date.split("-").map(Number);
      date = localIsoDate(new Date(y, mo - 1, d + 1));
      time = options[0] || "00:00";
    }
  }
  return { date, time };
}
