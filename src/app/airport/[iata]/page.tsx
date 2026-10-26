import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  asCardLocale,
  localizedAirportInfo,
  localizedAirportSeo,
  localizedAirportTitle,
} from "@/lib/catalog/homepage-airport-i18n";
import { withAutoTitleTranslations } from "@/lib/catalog/airport-card-auto-titles";
import { airportPageCopy } from "@/lib/catalog/airport-page-copy";
import { airportCountryIso2, findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  ensureAirportPrefaceTranslations,
  listHomepageAirports,
  type StoredHomepageAirport,
} from "@/lib/server/homepage-airports-store";
import { SiteImage } from "@/components/ui/site-image";
import { JsonLd } from "@/components/seo/json-ld";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, SITE_URL } from "@/lib/seo/config";
import { SEO_SITE_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

async function loadAirports(iata: string) {
  const code = normalizeLocationCode(decodeURIComponent(iata));
  const rows = code ? await listHomepageAirports() : [];
  return { rows, found: rows.find((row) => normalizeLocationCode(row.iata) === code) ?? null };
}

function airportNameOf(airport: StoredHomepageAirport): string {
  const code = airport.iata.toUpperCase();
  const name = findSearchPlace(code)?.name ?? "";
  return name.replace(new RegExp(`\\s*\\(${code}\\)\\s*$`), "") || code;
}

function pagePath(code: string) {
  return `/airport/${encodeURIComponent(normalizeLocationCode(code))}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iata: string }>;
}): Promise<Metadata> {
  const { iata } = await params;
  const [{ found }, { locale }] = await Promise.all([loadAirports(iata), readPreferences()]);
  if (!found) return { title: iata.toUpperCase(), robots: { index: false, follow: true } };
  const card = withAutoTitleTranslations(found);
  const airportName = airportNameOf(found);
  const code = normalizeLocationCode(found.iata);
  const seo = localizedAirportSeo(card, locale, { airportName });
  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: pagePath(code),
    locale: asCardLocale(locale),
    image: found.imageUrl || undefined,
    imageAlt: localizedAirportTitle(card, locale),
    keywords: [
      `car rental ${airportName}`,
      `rent a car ${airportName}`,
      `${code} car rental`,
      `${airportName} airport car hire`,
      localizedAirportTitle(card, locale),
    ],
  });
}

export default async function AirportInfoPage({
  params,
}: {
  params: Promise<{ iata: string }>;
}) {
  const { iata } = await params;
  const [{ rows, found }, { locale }] = await Promise.all([loadAirports(iata), readPreferences()]);
  if (!found) notFound();

  const airport = await ensureAirportPrefaceTranslations(found, locale, { onlyPreferred: true });
  const card = withAutoTitleTranslations(airport);
  const code = normalizeLocationCode(airport.iata);
  const airportName = airportNameOf(airport);
  const title = localizedAirportTitle(card, locale);
  const text = localizedAirportInfo(airport, locale);
  const seo = localizedAirportSeo(card, locale, { airportName });
  const copy = airportPageCopy(locale);
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const country = airportCountryIso2(code);
  const related = rows.filter(
    (row) => row.id !== airport.id && country && airportCountryIso2(row.iata) === country,
  );

  const url = absoluteUrl(pagePath(code));
  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: SEO_SITE_NAME, path: "/" },
      { name: title, path: pagePath(code) },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Car rental",
      name: title,
      description: seo.description,
      url,
      ...(airport.imageUrl ? { image: absoluteUrl(airport.imageUrl) } : {}),
      provider: { "@type": "Organization", name: SEO_SITE_NAME, url: SITE_URL },
      areaServed: /^CITY-/i.test(code)
        ? { "@type": "City", name: airportName }
        : { "@type": "Airport", name: airportName, iataCode: code },
    },
  ];

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-sky-700 hover:underline">
          {copy.home}
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-slate-700">{title}</span>
      </nav>
      {airport.imageUrl ? (
        <div className="relative mb-6 h-52 w-full overflow-hidden rounded-2xl sm:h-72">
          <SiteImage
            src={airport.imageUrl}
            alt={title}
            fill
            sizes="(max-width: 800px) 100vw, 768px"
            className="object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      ) : null}
      <h1 className="text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">{title}</h1>
      <div className="mt-5 space-y-4 text-base leading-7 text-slate-700">
        {paragraphs.length ? (
          paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-wrap break-words">
              {p}
            </p>
          ))
        ) : (
          <p>{copy.empty}</p>
        )}
      </div>
      <Link
        href={`/cars?pickup=${encodeURIComponent(code)}`}
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-center text-base font-bold text-white hover:bg-sky-700 sm:w-auto"
      >
        {copy.cta}
      </Link>
      {related.length ? (
        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-[#0b1f4b]">{copy.related}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((row) => (
              <li key={row.id} className="min-w-0">
                <Link
                  href={pagePath(row.iata)}
                  className="inline-flex min-h-10 max-w-full items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-sky-800 hover:bg-sky-50"
                >
                  <span className="truncate">{localizedAirportTitle(withAutoTitleTranslations(row), locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
