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
import { after } from "next/server";
import { ensureCountryCovers } from "@/lib/server/country-cover-auto";
import { softTimeout } from "@/lib/server/soft-timeout";
import type { CachedPublicRead } from "@/lib/server/public-data-cache";
import { staticHomepageAirports } from "@/lib/server/homepage";
import { bookingCountsByPickupIata } from "@/lib/server/airport-popularity";
import { airportCountryIso2, findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import { airportCardLinkLabel, popularCardHeadings } from "@/lib/seo/location-link-label";
import { carsInPlaceLabels } from "@/lib/i18n/place-phrase";
import { readPreferences } from "@/lib/server/preferences";
import { getCrossBorderReturnPlaces } from "@/lib/server/cross-border-returns";
import { popularPlacesListName } from "@/lib/seo/home-seo";
import { buildPlacesItemListJsonLd } from "@/lib/seo/json-ld";
import { PopularDestinations } from "@/components/seo/popular-destinations";

const DATA_WAIT_MS = 700;
/**
 * Below-fold sections stream after the hero, so a longer wait here does not
 * block the first paint. Giving up at ~1s was swapping in the built-in
 * Unsplash category/airport cards ("old version") on a cold Neon.
 */
const SECTION_WAIT_MS = 900;
/** Admin-saved homepage cards only — wait for Neon; never show the built-in set. */
const SAVED_CARDS_WAIT_MS = 6000;

/** Fresh value, else this instance's last good one, else `fallback`. */
function readOr<T>(read: CachedPublicRead<T>, fallback: T, ms: number): Promise<T> {
  return softTimeout(read(), read.peek() ?? fallback, ms);
}

/** Saved cards; the built-in ones only when nothing was ever loaded on this server. */
async function savedOrStatic<T>(read: CachedPublicRead<T[]>, fallback: () => T[], ms: number): Promise<T[]> {
  const rows = await readOr(read, [], ms);
  return rows.length ? rows : (read.peek() ?? fallback());
}

/** Like savedOrStatic, but never substitutes the stock Unsplash cards. */
async function savedCardsOnly<T>(read: CachedPublicRead<T[]>, ms: number): Promise<T[]> {
  const rows = await readOr(read, [], ms);
  if (rows.length) return rows;
  const peek = read.peek();
  return peek?.length ? peek : [];
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
const HERO_PLACES_WAIT_MS = 700;

export async function HomeHeroSection() {
  const [options, bookingChannels, popularAirports, cachedCovers, crossBorderReturns] = await Promise.all([
    readOr(cachedSearchDeliveryAirports, [], HERO_PLACES_WAIT_MS),
    readOr(cachedCustomBookingChannels, DEFAULT_CUSTOM_BOOKING_CHANNELS, DATA_WAIT_MS),
    savedOrStatic(cachedHomepageAirports, staticHomepageAirports, DATA_WAIT_MS),
    readOr(cachedCountryCovers, BUILT_IN_COUNTRY_COVERS, DATA_WAIT_MS),
    softTimeout(getCrossBorderReturnPlaces(), {}, HERO_PLACES_WAIT_MS),
  ]);
  // A map cached before a built-in cover was added would hide that country's photo.
  const countryCovers = { ...BUILT_IN_COUNTRY_COVERS, ...cachedCovers };
  const missingCovers = [
    ...new Set(options.map((o) => String(o.countryIso2 || "").toUpperCase()).filter(Boolean)),
  ].filter((iso) => !countryCovers[iso]);
  if (missingCovers.length) after(() => ensureCountryCovers(missingCovers));
  return (
    <HomeHeroWithIndividualBooking
      airports={options}
      channels={bookingChannels}
      popularIatas={popularAirports.map((a) => a.iata)}
      countryCovers={countryCovers}
      crossBorderReturns={crossBorderReturns}
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
    readOr(cachedSearchDeliveryAirports, [], SECTION_WAIT_MS),
    savedCardsOnly(cachedHomepageAirports, SAVED_CARDS_WAIT_MS),
    savedCardsOnly(cachedHomepageCategories, SAVED_CARDS_WAIT_MS),
    readOr(cachedPopularAirportsLayout, "grid" as const, SECTION_WAIT_MS),
    readOr(cachedHomepageInfoContent, defaultHomepageInfoContent(), SECTION_WAIT_MS),
    readOr(cachedHomepageGoogleReviews, null, SECTION_WAIT_MS),
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
      name: airportCardLinkLabel(a.iata, locale),
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
          name: airportCardLinkLabel(a.iata, "en"),
          city: findSearchPlace(a.iata)?.cityName || a.iata,
          image: a.imageUrl,
          rank: index + 1,
          headings: popularCardHeadings(a.iata),
          actions: carsInPlaceLabels(findSearchPlace(a.iata)?.cityName || a.iata),
          countryIso2: airportCountryIso2(a.iata),
        }))}
      />
      <WhyChooseUsPanel content={infoContent} />
      {googleReviews ? <GoogleReviewsCarousel {...googleReviews} /> : null}
      <PopularDestinations locale={locale} variant="home" />
    </>
  );
}
