const STORAGE_KEY = "rac.route-timings.v1";
const MAX_ROUTES = 200;
const NEW_SAMPLE_WEIGHT = 0.4;
const MIN_ROUTES_FOR_GLOBAL_GUESS = 3;

type TimingMap = Record<string, number>;

/** Booking refs, uuids, cuids and numeric ids share one timing per page type. */
export function routeTimingKey(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    const segments = url.pathname
      .split("/")
      .map((segment) =>
        /^\d+$/.test(segment) ||
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) ||
        /^c[a-z0-9]{20,}$/i.test(segment) ||
        /^11R\d+$/i.test(segment)
          ? ":id"
          : segment,
      );
    return segments.join("/") || "/";
  } catch {
    return "/";
  }
}

function readTimings(): TimingMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as TimingMap) : {};
  } catch {
    return {};
  }
}

/** Expected load time in ms for `href`, or null when nothing has been measured yet. */
export function estimateRouteMs(href: string): number | null {
  const timings = readTimings();
  const known = timings[routeTimingKey(href)];
  if (Number.isFinite(known) && known > 0) return known;
  const values = Object.values(timings).filter((ms) => Number.isFinite(ms) && ms > 0);
  if (values.length < MIN_ROUTES_FOR_GLOBAL_GUESS) return null;
  return values.reduce((sum, ms) => sum + ms, 0) / values.length;
}

export function recordRouteMs(href: string, ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  try {
    const timings = readTimings();
    const key = routeTimingKey(href);
    const previous = timings[key];
    delete timings[key];
    timings[key] = Math.round(
      Number.isFinite(previous) && previous > 0
        ? previous * (1 - NEW_SAMPLE_WEIGHT) + ms * NEW_SAMPLE_WEIGHT
        : ms,
    );
    const keys = Object.keys(timings);
    if (keys.length > MAX_ROUTES) {
      for (const stale of keys.slice(0, keys.length - MAX_ROUTES)) delete timings[stale];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timings));
  } catch {
    /* private mode / quota: the spinner still works without a countdown */
  }
}
