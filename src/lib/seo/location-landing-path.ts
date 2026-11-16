import type { Locale } from "@/lib/i18n/config";

/** Edge-safe path helpers for SEO city/airport landings (no catalog imports). */

export const SEO_LANDING_LOCALES = [
  "en",
  "ka",
  "ru",
  "pl",
  "de",
  "es",
  "fr",
  "it",
  "nl",
  "tr",
] as const satisfies readonly Locale[];

export type SeoLandingLocale = (typeof SEO_LANDING_LOCALES)[number];

export const SEO_LANDING_PREFIX: Record<SeoLandingLocale, string> = {
  en: "car-rental",
  ka: "mankanis-daqiraveba",
  ru: "arenda-avto",
  pl: "wynajem-aut",
  de: "autovermietung",
  es: "alquiler-de-coches",
  fr: "location-voiture",
  it: "noleggio-auto",
  nl: "autoverhuur",
  tr: "arac-kiralama",
};

export function isSeoLandingLocale(value: string | undefined | null): value is SeoLandingLocale {
  return Boolean(value && (SEO_LANDING_LOCALES as readonly string[]).includes(value));
}

export function seoLandingPrefix(locale: Locale): string {
  if (isSeoLandingLocale(locale)) return SEO_LANDING_PREFIX[locale];
  return SEO_LANDING_PREFIX.en;
}

export function parseSeoLandingPath(
  localeRaw: string,
  landingRaw: string,
): { locale: SeoLandingLocale; slug: string; prefix: string } | null {
  if (!isSeoLandingLocale(localeRaw)) return null;
  const prefix = SEO_LANDING_PREFIX[localeRaw];
  const landing = decodeURIComponent(landingRaw).trim().toLowerCase();
  const expected = `${prefix}-`;
  if (!landing.startsWith(expected)) return null;
  const slug = landing.slice(expected.length);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return { locale: localeRaw, slug, prefix };
}

export function seoLandingPath(locale: Locale, slug: string): string {
  const loc = isSeoLandingLocale(locale) ? locale : "en";
  return `/${loc}/${SEO_LANDING_PREFIX[loc]}-${slug}`;
}

export function seoLandingLanguageAlternates(slug: string): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": seoLandingPath("en", slug),
  };
  for (const locale of SEO_LANDING_LOCALES) {
    languages[locale] = seoLandingPath(locale, slug);
  }
  return languages;
}
