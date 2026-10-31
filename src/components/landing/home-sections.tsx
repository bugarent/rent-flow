import { HomeHeroWithIndividualBooking } from "@/components/landing/home-hero-with-individual-booking";
import { CategorySlider } from "@/components/landing/category-slider";
import { PopularAirports } from "@/components/landing/popular-airports";
import { GoogleReviewsCarousel } from "@/components/landing/google-reviews-carousel";
import { HowItWorksPanel, WhyChooseUsPanel } from "@/components/landing/why-and-how";
import { JsonLd } from "@/components/seo/json-ld";
import {
  cachedCountryCovers,
  cachedCustomBookingChannels,
  cachedHomepageAirports,
  cachedHomepageCategories,
  cachedHomepageGoogleReviews,
  cachedHomepageInfoContent,
  cachedPopularAirportsLayout,
  cachedSearchDeliveryAirports,
} from "@/lib/server/public-page-data";
import { defaultHomepageInfoContent } from "@/lib/server/homepage-info-blocks-store";
import { DEFAULT_CUSTOM_BOOKING_CHANNELS } from "@/lib/catalog/custom-booking-channels";
import { BUILT_IN_COUNTRY_COVERS } from "@/lib/catalog/country-covers";
import { softTimeout } from "@/lib/server/soft-timeout";
import { bookingCountsByPickupIata } from "@/lib/server/airport-popularity";
import type { AirportCardTranslations } from "@/lib/catalog/homepage-airport-i18n";
import { localizedAirportTitle } from "@/lib/catalog/homepage-airport-i18n";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";
import { airportCountryIso2, findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import { withAutoTitleTranslations } from "@/lib/catalog/airport-card-auto-titles";
import { readPreferences } from "@/lib/server/preferences";
import { popularPlacesListName } from "@/lib/seo/home-seo";
import { buildPlacesItemListJsonLd } from "@/lib/seo/json-ld";
import { plainHeading } from "@/lib/catalog/airport-seo";

const DATA_WAIT_MS = 1200;

function airportFallback() {
  return getStaticPopularAirports().map((a) => ({
    id: a.iata,
    iata: a.iata,
    title: a.name,
    imageUrl: a.image,
  }));
}

/**
 * Cards only show the title. The full page text and SEO lines in every language made the
 * homepage HTML ~0.5 MB larger, so only titles go to the browser (all languages, for switching).
 */
function titleOnly(translations: AirportCardTranslations | undefined): AirportCardTranslations {
  const out: AirportCardTranslations = {};
  for (const [lang, row] of Object.entries(translations ?? {})) {
    const title = row?.title?.trim();
    if (title) out[lang as keyof AirportCardTranslations] = { title };
  }
  return out;
}

function categoryFallback() {
  return VEHICLE_CATEGORIES.map((c) => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    details: summarizeMappedModels(c.mappedModels) || c.model,
    imageUrl: c.image,
    mappedModels: c.mappedModels ?? [],
  }));
}

/** Hero shown in the first bytes, before any data: the photo is the LCP and must not wait. */
export function HomeHeroPlaceholder() {
  return (
    <HomeHeroWithIndividualBooking
      airports={[]}
      channels={DEFAULT_CUSTOM_BOOKING_CHANNELS}
      popularIatas={[]}
      countryCovers={BUILT_IN_COUNTRY_COVERS}
    />
  );
}

/** The hero placeholder is already on screen, so waiting longer here delays nothing visible. */
const HERO_PLACES_WAIT_MS = 3000;

export async function HomeHeroSection() {
  const [options, bookingChannels, popularAirports, countryCovers] = await Promise.all([
    softTimeout(cachedSearchDeliveryAirports(), [], HERO_PLACES_WAIT_MS),
    softTimeout(cachedCustomBookingChannels(), DEFAULT_CUSTOM_BOOKING_CHANNELS, DATA_WAIT_MS),
    softTimeout(cachedHomepageAirports(), airportFallback(), DATA_WAIT_MS),
    softTimeout(cachedCountryCovers(), BUILT_IN_COUNTRY_COVERS, DATA_WAIT_MS),
  ]);
  return (
    <HomeHeroWithIndividualBooking
      airports={options}
      channels={bookingChannels}
      popularIatas={popularAirports.map((a) => a.iata)}
      countryCovers={countryCovers}
    />
  );
}

/** Keeps the footer below the fold while the sections stream, so nothing on screen shifts. */
export function HomeBelowFoldPlaceholder() {
  return <div className="min-h-[100dvh] w-full" aria-hidden />;
}

export async function HomeBelowFold() {
  const [
    options,
    popularAirports,
    categories,
    airportsLayout,
    infoContent,
    googleReviews,
    bookingCounts,
    { locale },
  ] = await Promise.all([
    softTimeout(cachedSearchDeliveryAirports(), [], DATA_WAIT_MS),
    softTimeout(cachedHomepageAirports(), airportFallback(), DATA_WAIT_MS),
    softTimeout(cachedHomepageCategories(), categoryFallback(), DATA_WAIT_MS),
    softTimeout(cachedPopularAirportsLayout(), "grid" as const, DATA_WAIT_MS),
    softTimeout(cachedHomepageInfoContent(), defaultHomepageInfoContent(), DATA_WAIT_MS),
    softTimeout(cachedHomepageGoogleReviews(), null, DATA_WAIT_MS),
    softTimeout(bookingCountsByPickupIata(), new Map<string, number>(), 800),
    readPreferences(),
  ]);

  // Popular airport cards: most booked first, then the larger fleet, then the admin's order.
  const carCountByIata = new Map(options.map((o) => [o.iata.toUpperCase(), o.carCount ?? 0]));
  const rankedAirports = popularAirports
    .map((airport, index) => ({ airport, index }))
    .sort((a, b) => {
      const iataA = a.airport.iata.toUpperCase();
      const iataB = b.airport.iata.toUpperCase();
      return (
        (bookingCounts.get(iataB) ?? 0) - (bookingCounts.get(iataA) ?? 0) ||
        (carCountByIata.get(iataB) ?? 0) - (carCountByIata.get(iataA) ?? 0) ||
        a.index - b.index
      );
    })
    .map(({ airport }) => airport);

  const placesJsonLd = buildPlacesItemListJsonLd(
    popularPlacesListName(locale),
    popularAirports.map((a) => ({
      name: plainHeading(
        localizedAirportTitle(
          withAutoTitleTranslations({
            iata: a.iata,
            title: a.title,
            translations: "translations" in a ? (a.translations as AirportCardTranslations) : undefined,
          }),
          locale,
        ),
      ),
      path: `/airport/${encodeURIComponent(normalizeLocationCode(a.iata))}`,
    })),
  );

  return (
    <>
      {popularAirports.length ? <JsonLd data={placesJsonLd} /> : null}
      <CategorySlider
        categories={categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          details: c.details,
          imageUrl: c.imageUrl,
        }))}
      />
      <HowItWorksPanel content={infoContent} />
      <PopularAirports
        layout={airportsLayout}
        airports={rankedAirports.map((a, index) => ({
          iata: a.iata,
          name: a.title,
          city: findSearchPlace(a.iata)?.cityName || a.iata,
          image: a.imageUrl,
          rank: index + 1,
          translations: titleOnly(
            withAutoTitleTranslations({
              iata: a.iata,
              title: a.title,
              translations: "translations" in a ? (a.translations as AirportCardTranslations) : undefined,
            }).translations,
          ),
          countryIso2: airportCountryIso2(a.iata),
        }))}
      />
      <WhyChooseUsPanel content={infoContent} />
      {googleReviews ? <GoogleReviewsCarousel {...googleReviews} /> : null}
    </>
  );
}
