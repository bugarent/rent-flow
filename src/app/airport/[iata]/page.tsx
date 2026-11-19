import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  asCardLocale,
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
import {
  faqsForSchema,
  LocationBenefits,
  LocationCarPreview,
  LocationDriveNotes,
  LocationFaqSection,
  LocationIntro,
  locationPageBottomClass,
} from "@/components/seo/location-landing-sections";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildLocationAutoRentalJsonLd, buildWebPageJsonLd } from "@/lib/seo/json-ld";
import { airportCardLinkLabel } from "@/lib/seo/location-link-label";
import { genericLocationIntro, locationIntro } from "@/lib/seo/location-intro";
import { locationRouteLines } from "@/lib/seo/location-drives";
import { cityDisplayName } from "@/lib/i18n/place-label";
import { loadLocationLandingExtras } from "@/lib/seo/location-landing-data";
import {
  countryDisplayName,
  findSeoLocationByCode,
  listSeoLocations,
  locationLandingCopy,
  seoLandingLanguageAlternates,
  seoLandingPath,
  type SeoLocation,
} from "@/lib/seo/location-landings";
import { absoluteUrl } from "@/lib/seo/config";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { emptyFooterContact } from "@/lib/catalog/footer-contact";
import { getFooterContactConfig } from "@/lib/server/footer-contact-store";
import { softTimeout } from "@/lib/server/soft-timeout";

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
  const selfPath = pagePath(code);
  const locations = await listSeoLocations();
  const landing = findSeoLocationByCode(locations, code);
  const canonicalPath = landing ? seoLandingPath("en", landing.slug) : selfPath;
  const landingCopy = landing ? locationLandingCopy(landing, "en") : null;
  return buildPageMetadata({
    title: landingCopy?.title || seo.title,
    description: landingCopy?.description || seo.description,
    path: selfPath,
    canonicalPath,
    locale: landing ? "en" : asCardLocale(locale),
    languages: landing ? seoLandingLanguageAlternates(landing.slug) : { "x-default": selfPath },
    image: found.imageUrl || undefined,
    imageAlt: localizedAirportTitle(card, locale),
    keywords: landingCopy?.keywords || [
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
  const seo = localizedAirportSeo(card, locale, { airportName });
  const copy = airportPageCopy(locale);
  const kind = /^CITY-/i.test(code) ? "city" : "airport";
  const place = findSearchPlace(code);
  const placeLabel =
    cityDisplayName(locale, place?.cityName || airportName) || place?.cityName || airportName;
  const heading = airportCardLinkLabel(code, locale);
  const hasDrives = locationRouteLines(code, locale, place?.cityName).length > 0;
  const intro =
    locationIntro(code, locale) ?? genericLocationIntro(locale, kind, placeLabel, hasDrives);
  const country = airportCountryIso2(code);
  const seen = new Set<string>();
  const ranked = [
    ...rows.filter((row) => country && airportCountryIso2(row.iata) === country),
    ...rows,
  ];
  const related: StoredHomepageAirport[] = [];
  for (const row of ranked) {
    const rowCode = normalizeLocationCode(row.iata);
    if (!rowCode || rowCode === code || seen.has(rowCode)) continue;
    seen.add(rowCode);
    related.push(row);
    if (related.length >= 12) break;
  }
  const seoLocation: SeoLocation = {
    code,
    kind,
    slug: "",
    cityName: place?.cityName || airportName,
    placeName: airportName,
    countryIso2: country || "",
    iata: kind === "airport" ? code : undefined,
  };

  const locationsForCanonical = await listSeoLocations();
  const landingMatch = findSeoLocationByCode(locationsForCanonical, code);
  const canonicalPath = landingMatch ? seoLandingPath("en", landingMatch.slug) : pagePath(code);
  const url = absoluteUrl(canonicalPath);
  const breadcrumbId = `${url}#breadcrumb`;
  const faqId = `${url}#faq`;
  const [footerContact, extras] = await Promise.all([
    softTimeout(getFooterContactConfig(), emptyFooterContact(), 1500),
    softTimeout(
      loadLocationLandingExtras(seoLocation),
      { samples: [], lowPriceEur: null, offerCount: null },
      2500,
    ),
  ]);
  const catalog = CATALOG_AIRPORTS.find((a) => a.iata === code);
  const countryLabel = country
    ? countryDisplayName(country, asCardLocale(locale)) || country
    : "";
  const breadcrumb = [
    { name: copy.home, path: "/" },
    ...(countryLabel ? [{ name: countryLabel, path: "/locations" as const }] : []),
    { name: heading, path: canonicalPath },
  ];
  const faqLd = buildFaqPageJsonLd(faqsForSchema(locale, kind), faqId);
  const jsonLd = [
    buildWebPageJsonLd({
      name: heading,
      description: seo.description,
      url,
      locale,
      breadcrumbId,
      ...(faqLd ? { faqId } : {}),
    }),
    buildBreadcrumbJsonLd(breadcrumb, breadcrumbId),
    buildLocationAutoRentalJsonLd({
      name: heading,
      description: seo.description,
      url,
      image: airport.imageUrl || undefined,
      telephone: footerContact.phone,
      email: footerContact.email,
      addressLocality: findSearchPlace(code)?.cityName || airportName,
      addressCountry: country || undefined,
      latitude: catalog?.latitude ?? null,
      longitude: catalog?.longitude ?? null,
      areaServed: /^CITY-/i.test(code)
        ? { "@type": "City", name: airportName }
        : { "@type": "Airport", name: airportName, iataCode: code },
    }),
    ...(faqLd ? [faqLd] : []),
  ];

  return (
    <article className={`mx-auto w-full max-w-3xl px-4 pt-10 sm:pt-14 ${locationPageBottomClass()}`}>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-sky-700 hover:underline">
              {copy.home}
            </Link>
          </li>
          {countryLabel ? (
            <>
              <li aria-hidden>›</li>
              <li>
                <Link href="/locations" className="hover:text-sky-700 hover:underline">
                  {countryLabel}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>›</li>
          <li className="min-w-0 break-words text-slate-700">{heading}</li>
        </ol>
      </nav>
      {airport.imageUrl ? (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-200 sm:aspect-[2/1]">
          <SiteImage
            src={airport.imageUrl}
            alt={
              kind === "airport" && code
                ? `${airportName}${airportName.includes(code) ? "" : ` (${code})`}`
                : heading
            }
            fill
            sizes="(max-width: 800px) 100vw, 768px"
            className="object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      ) : null}
      <h1 className="break-words text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">{heading}</h1>
      <LocationIntro intro={intro} />
      <Link
        href={`/cars?pickup=${encodeURIComponent(code)}`}
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-center text-base font-bold text-white hover:bg-sky-700 sm:w-auto"
      >
        {copy.cta}
      </Link>
      <LocationBenefits locale={locale} />
      <LocationDriveNotes locale={locale} kind={kind} routeCode={code} cityName={place?.cityName} />
      <LocationCarPreview locale={locale} cars={extras.samples} />
      {related.length ? (
        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-[#0b1f4b]">{copy.related}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((row) => (
              <li key={row.id} className="min-w-0 max-w-full">
                <Link
                  href={pagePath(row.iata)}
                  className="inline-flex min-h-10 max-w-full items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-sky-800 hover:bg-sky-50"
                >
                  <span className="break-words">{airportCardLinkLabel(row.iata, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <LocationFaqSection locale={locale} kind={kind} />
    </article>
  );
}
