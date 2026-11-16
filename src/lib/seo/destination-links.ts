import type { Locale } from "@/lib/i18n/config";
import {
  isSeoLandingLocale,
  listSeoLocations,
  locationLandingCopy,
  seoLandingPath,
} from "@/lib/seo/location-landings";
import { softTimeout } from "@/lib/server/soft-timeout";

export type SeoDestinationLink = {
  href: string;
  label: string;
  code: string;
};

/** Lightweight destination anchors for footer / homepage internal linking. */
export async function listSeoDestinationLinks(
  locale: Locale,
  limit = 24,
): Promise<SeoDestinationLink[]> {
  const locations = await softTimeout(listSeoLocations(), [], 3000);
  const seoLocale = isSeoLandingLocale(locale) ? locale : "en";
  return locations.slice(0, limit).map((row) => ({
    code: row.code,
    href: seoLandingPath(seoLocale, row.slug),
    label: locationLandingCopy(row, seoLocale).anchor,
  }));
}
