import { SITE_DOMAIN } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/config";

export const SITE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
  `https://${SITE_DOMAIN}`;

export const DEFAULT_OG_IMAGE = "/images/hero-tarmac.jpg";
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

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localeHtmlLang(locale: Locale): string {
  return locale;
}
