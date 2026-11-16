import Link from "next/link";
import {
  listSeoLocations,
  locationLandingCopy,
  seoLandingPath,
  type SeoLandingLocale,
  isSeoLandingLocale,
} from "@/lib/seo/location-landings";
import { softTimeout } from "@/lib/server/soft-timeout";
import type { Locale } from "@/lib/i18n/config";

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
  const locations = await softTimeout(listSeoLocations(), [], 3500);
  if (!locations.length) return null;

  const seoLocale: SeoLandingLocale = isSeoLandingLocale(locale) ? locale : "en";
  const rows = locations.slice(0, limit);
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
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12" aria-labelledby="seo-home-destinations">
      <h2 id="seo-home-destinations" className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const copy = locationLandingCopy(row, seoLocale);
          return (
            <li key={row.code}>
              <Link
                href={seoLandingPath(seoLocale, row.slug)}
                className="inline-flex min-h-11 w-full items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-sky-900 hover:bg-sky-50"
              >
                {copy.anchor}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
