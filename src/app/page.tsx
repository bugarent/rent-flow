import { HomeHeroWithIndividualBooking } from "@/components/landing/home-hero-with-individual-booking";
import { CategorySlider } from "@/components/landing/category-slider";
import { PopularAirports } from "@/components/landing/popular-airports";
import { GoogleReviewsCarousel } from "@/components/landing/google-reviews-carousel";
import { HowItWorksPanel, WhyChooseUsPanel } from "@/components/landing/why-and-how";
import {
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
import { softTimeout } from "@/lib/server/soft-timeout";
import { bookingCountsByPickupIata } from "@/lib/server/airport-popularity";
import type { AirportCardTranslations } from "@/lib/catalog/homepage-airport-i18n";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";
import { airportCountryIso2, findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import { withAutoTitleTranslations } from "@/lib/catalog/airport-card-auto-titles";
import type { Metadata } from "next";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";
import { buildHomeSeo, popularPlacesListName } from "@/lib/seo/home-seo";
import { buildPlacesItemListJsonLd } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/seo/json-ld";
import { localizedAirportTitle } from "@/lib/catalog/homepage-airport-i18n";
import { plainHeading } from "@/lib/catalog/airport-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, airports] = await Promise.all([
    readPreferences(),
    softTimeout(cachedHomepageAirports(), [], 800),
  ]);
  const seo = buildHomeSeo(locale, airports.map((a) => a.iata));
  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: "/",
    locale,
    keywords: [...(getPageSeo("home", locale).keywords ?? []), "RENT AIRPORT CARS", "rent airport cars"],
  });
}

export default async function Home() {
  const categoryFallback = VEHICLE_CATEGORIES.map((c) => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    details: summarizeMappedModels(c.mappedModels) || c.model,
    imageUrl: c.image,
    mappedModels: c.mappedModels ?? [],
  }));
  const airportFallback = getStaticPopularAirports().map((a) => ({
    id: a.iata,
    iata: a.iata,
    title: a.name,
    imageUrl: a.image,
  }));

  const [
    options,
    popularAirports,
    categories,
    airportsLayout,
    infoContent,
    googleReviews,
    bookingChannels,
    bookingCounts,
    { locale },
  ] = await Promise.all([
    softTimeout(cachedSearchDeliveryAirports(), [], 1200),
    softTimeout(cachedHomepageAirports(), airportFallback, 1200),
    softTimeout(cachedHomepageCategories(), categoryFallback, 1200),
    softTimeout(cachedPopularAirportsLayout(), "grid" as const, 1200),
    softTimeout(cachedHomepageInfoContent(), defaultHomepageInfoContent(), 1200),
    softTimeout(cachedHomepageGoogleReviews(), null, 1200),
    softTimeout(cachedCustomBookingChannels(), DEFAULT_CUSTOM_BOOKING_CHANNELS, 1200),
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
    <div className="flex w-full min-w-0 flex-col overflow-x-clip">
      {popularAirports.length ? <JsonLd data={placesJsonLd} /> : null}
      <link
        rel="preload"
        as="image"
        href="/images/hero-tarmac-sm.webp"
        media="(max-width: 828px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/images/hero-tarmac.webp"
        media="(min-width: 829px)"
        fetchPriority="high"
      />
      <HomeHeroWithIndividualBooking
        airports={options}
        channels={bookingChannels}
        popularIatas={popularAirports.map((a) => a.iata)}
      />
      <CategorySlider categories={categories} />
      <HowItWorksPanel content={infoContent} />
      <PopularAirports
        layout={airportsLayout}
        airports={rankedAirports.map((a, index) => ({
          iata: a.iata,
          name: a.title,
          city: findSearchPlace(a.iata)?.cityName || a.iata,
          image: a.imageUrl,
          rank: index + 1,
          translations: withAutoTitleTranslations({
            iata: a.iata,
            title: a.title,
            translations: "translations" in a ? (a.translations as AirportCardTranslations) : undefined,
          }).translations,
          countryIso2: airportCountryIso2(a.iata),
        }))}
      />
      <WhyChooseUsPanel content={infoContent} />
      {googleReviews ? <GoogleReviewsCarousel {...googleReviews} /> : null}
    </div>
  );
}
