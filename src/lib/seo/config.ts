import { SITE_DOMAIN } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/config";

export const SITE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
  `https://${SITE_DOMAIN}`;

export const DEFAULT_OG_IMAGE = "/images/hero-tarmac.webp";
export const DEFAULT_OG_IMAGE_ALT =
  "Airport car rental in Georgia — Kutaisi, Tbilisi and Batumi";

/** Primary SEO focus: Kutaisi (KUT) + Georgia airports. */
export const PRIMARY_KEYWORDS = [
  "Kutaisi airport car rental",
  "car rental Kutaisi International Airport",
  "KUT car hire",
  "Georgia airport car rental",
  "Tbilisi airport car rental",
  "Batumi airport car rental",
  "rent a car Georgia",
  "airport car hire Georgia",
] as const;

/** Path-only URL for canonicals / OG — strips ?query and #hash so filter/date variants collapse. */
export function cleanSitePath(path = "/"): string {
  const raw = String(path || "/").trim() || "/";
  const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/i, "");
  const pathOnly = withoutOrigin.split(/[?#]/)[0] || "/";
  if (!pathOnly || pathOnly === "/") return "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

export function absoluteUrl(path = "/"): string {
  const cleaned = cleanSitePath(path);
  if (cleaned === "/") return SITE_URL;
  return `${SITE_URL}${cleaned}`;
}

/** Canonical href for a car detail page — never includes trip/filter query params. */
export function carDetailCanonicalUrl(carId: string): string {
  const id = String(carId || "").trim();
  return absoluteUrl(`/cars/${encodeURIComponent(id)}`);
}

export function localeHtmlLang(locale: Locale): string {
  return locale;
}
