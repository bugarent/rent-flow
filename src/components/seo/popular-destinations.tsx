import Link from "next/link";
import {
  buildSeoLocations,
  locationLandingCopy,
  seoLandingPath,
  type SeoLandingLocale,
  isSeoLandingLocale,
} from "@/lib/seo/location-landings";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import { getSearchDeliveryAirports } from "@/lib/server/delivery-locations";
import { softTimeout } from "@/lib/server/soft-timeout";
import type { Locale } from "@/lib/i18n/config";
import { DestinationSlideshow } from "@/components/seo/destination-slideshow";

function heading(locale: Locale): string {
  if (locale === "ka") return "პოპულარული მიმართულებები";
  if (locale === "ru") return "Популярные направления";
  if (locale === "pl") return "Popularne kierunki";
  if (locale === "de") return "Beliebte Ziele";
  return "Popular destinations";
}

/** Crawlable internal links to localized city/airport landings. */
export async function PopularDestinations({
  locale,
  limit = 24,
  variant = "footer",
}: {
  locale: Locale;
  limit?: number;
  variant?: "footer" | "home";
}) {
  const active = await softTimeout(getSearchDeliveryAirports(), [], 3500);
  const ranked = [...active].sort((a, b) => (b.carCount ?? 0) - (a.carCount ?? 0));
  const order = new Map(ranked.map((row, index) => [normalizeLocationCode(row.iata), index]));
  const locations = buildSeoLocations(
    ranked.map((row) => ({ code: row.iata, kind: row.kind, label: row.label })),
  ).sort(
    (a, b) =>
      (order.get(normalizeLocationCode(a.code)) ?? 999) - (order.get(normalizeLocationCode(b.code)) ?? 999),
  );
  if (!locations.length) return null;

  const seoLocale: SeoLandingLocale = isSeoLandingLocale(locale) ? locale : "en";
  const rows = variant === "home" ? locations : locations.slice(0, limit);
  const title = heading(locale);

  if (variant === "footer") {
    return (
      <section className="border-t border-white/10" aria-labelledby="seo-destinations-heading">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h3
            id="seo-destinations-heading"
            className="mb-3 text-sm font-bold uppercase tracking-wide text-white"
          >
            {title}
          </h3>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const copy = locationLandingCopy(row, seoLocale);
              return (
                <li key={row.code} className="min-w-0">
                  <Link
                    href={seoLandingPath(seoLocale, row.slug)}
                    className="inline-flex min-h-11 max-w-full items-center py-2 text-sm font-medium text-white/95 hover:text-white hover:underline"
                  >
                    <span className="truncate">{copy.anchor}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <DestinationSlideshow
      title={title}
      items={rows.map((row) => ({
        href: seoLandingPath(seoLocale, row.slug),
        label: locationLandingCopy(row, seoLocale).anchor,
      }))}
    />
  );
}
