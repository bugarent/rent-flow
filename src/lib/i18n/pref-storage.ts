import { isRtl, type Locale } from "@/lib/i18n/config";

/**
 * Shared locale/currency persistence: cookie (SSR) + localStorage (client restore).
 * Each portal uses its own key so public / partner / admin / business-partner stay independent.
 */

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
}

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export function writePrefCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${YEAR_SECONDS}; SameSite=Lax`;
}

export function readPrefCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function writePrefLocal(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

export function readPrefLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Persist to cookie + localStorage and notify other tabs/listeners. */
export function persistPref(cookieName: string, storageKey: string, value: string) {
  writePrefCookie(cookieName, value);
  writePrefLocal(storageKey, value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("rac-pref-change", { detail: { key: storageKey, value } }),
    );
  }
}

/** Clear cookie + localStorage for a preference key. */
export function clearPref(cookieName: string, storageKey: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Resolve preference: cookie first (matches SSR), then localStorage, then default.
 * Also re-syncs cookie from localStorage when cookie is missing.
 */
export function resolveClientPref(
  cookieName: string,
  storageKey: string,
  isValid: (v: string) => boolean,
  fallback: string,
): string {
  const fromCookie = readPrefCookie(cookieName);
  if (fromCookie && isValid(fromCookie)) {
    writePrefLocal(storageKey, fromCookie);
    return fromCookie;
  }
  const fromLocal = readPrefLocal(storageKey);
  if (fromLocal && isValid(fromLocal)) {
    writePrefCookie(cookieName, fromLocal);
    return fromLocal;
  }
  return fallback;
}
