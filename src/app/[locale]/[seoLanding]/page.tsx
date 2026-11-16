import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { SEO_SITE_NAME } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, SITE_URL } from "@/lib/seo/config";
import {
  findSeoLocationBySlug,
  listSeoLocations,
  locationLandingCopy,
  parseSeoLandingPath,
  seoLandingLanguageAlternates,
  seoLandingPath,
  seoLandingStaticParams,
  type SeoLocation,
} from "@/lib/seo/location-landings";
import { softTimeout } from "@/lib/server/soft-timeout";

export const dynamic = "force-dynamic";

async function loadLocation(locale: string, seoLanding: string): Promise<{
  parsed: NonNullable<ReturnType<typeof parseSeoLandingPath>>;
  location: SeoLocation;
  locations: SeoLocation[];
} | null> {
  const parsed = parseSeoLandingPath(locale, seoLanding);
  if (!parsed) return null;
  const locations = await softTimeout(listSeoLocations(), [], 4000);
  const location = findSeoLocationBySlug(locations, parsed.slug);
  if (!location) return null;
  return { parsed, location, locations };
}

export async function generateStaticParams() {
  const locations = await softTimeout(listSeoLocations(), [], 5000);
  return seoLandingStaticParams(locations).slice(0, 2500);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; seoLanding: string }>;
}): Promise<Metadata> {
  const { locale, seoLanding } = await params;
  const loaded = await loadLocation(locale, seoLanding);
  if (!loaded) return { title: SEO_SITE_NAME, robots: { index: false, follow: true } };
  const { parsed, location } = loaded;
  const copy = locationLandingCopy(location, parsed.locale);
  const path = seoLandingPath(parsed.locale, location.slug);
  return buildPageMetadata({
    title: copy.title,
    description: copy.description,
    path,
    locale: parsed.locale,
    keywords: copy.keywords,
    languages: seoLandingLanguageAlternates(location.slug),
  });
}

export default async function SeoLocationLandingPage({
  params,
}: {
  params: Promise<{ locale: string; seoLanding: string }>;
}) {
  const { locale, seoLanding } = await params;
  const loaded = await loadLocation(locale, seoLanding);
  if (!loaded) notFound();

  const { parsed, location, locations } = loaded;
  const copy = locationLandingCopy(location, parsed.locale);
  const path = seoLandingPath(parsed.locale, location.slug);
  const pickup = encodeURIComponent(location.code);
  const searchHref = `/cars?pickup=${pickup}`;

  const related = locations
    .filter((row) => row.code !== location.code && row.countryIso2 === location.countryIso2)
    .slice(0, 12);
  const popular = (related.length ? related : locations.filter((r) => r.code !== location.code)).slice(
    0,
    16,
  );

  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: SEO_SITE_NAME, path: "/" },
      { name: copy.h1, path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Car rental",
      name: copy.h1,
      description: copy.description,
      url: absoluteUrl(path),
      provider: { "@type": "Organization", name: SEO_SITE_NAME, url: SITE_URL },
      areaServed:
        location.kind === "city"
          ? { "@type": "City", name: location.cityName }
          : {
              "@type": "Airport",
              name: location.placeName,
              ...(location.iata ? { iataCode: location.iata } : {}),
            },
    },
  ];

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-slate-800">
              {copy.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-semibold text-slate-700">{copy.h1}</li>
        </ol>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {copy.h1}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{copy.lead}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={searchHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b1f4b] px-5 text-sm font-bold text-white hover:bg-[#12306e]"
          >
            {copy.cta}
          </Link>
          <Link
            href="/locations"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            {parsed.locale === "ka"
              ? "ყველა მიმართულება"
              : parsed.locale === "ru"
                ? "Все направления"
                : "All destinations"}
          </Link>
        </div>
      </header>

      {popular.length ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-extrabold text-slate-900">{copy.popularTitle}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {popular.map((row) => {
              const rowCopy = locationLandingCopy(row, parsed.locale);
              return (
                <li key={row.code}>
                  <Link
                    href={seoLandingPath(parsed.locale, row.slug)}
                    className="inline-flex min-h-11 w-full items-center rounded-lg px-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 hover:underline"
                  >
                    {rowCopy.anchor}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Hidden hreflang helpers for crawlers that prefer in-body links */}
      <nav className="sr-only" aria-label="Language versions">
        {Object.entries(seoLandingLanguageAlternates(location.slug)).map(([lang, href]) =>
          lang === "x-default" ? null : (
            <Link key={lang} href={href} hrefLang={lang}>
              {lang}
            </Link>
          ),
        )}
      </nav>
    </article>
  );
}
