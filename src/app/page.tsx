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
import type { AirportCardTranslations } from "@/lib/catalog/homepage-airport-i18n";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";
import { airportCountryIso2 } from "@/lib/catalog/search-places";
import { withAutoTitleTranslations } from "@/lib/catalog/airport-card-auto-titles";

export const dynamic = "force-dynamic";

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

  const [options, popularAirports, categories, airportsLayout, infoContent, googleReviews, bookingChannels] =
    await Promise.all([
      softTimeout(cachedSearchDeliveryAirports(), [], 6000),
      softTimeout(cachedHomepageAirports(), airportFallback, 6000),
      softTimeout(cachedHomepageCategories(), categoryFallback, 6000),
      softTimeout(cachedPopularAirportsLayout(), "grid" as const, 6000),
      softTimeout(cachedHomepageInfoContent(), defaultHomepageInfoContent(), 6000),
      softTimeout(cachedHomepageGoogleReviews(), null, 6000),
      softTimeout(cachedCustomBookingChannels(), DEFAULT_CUSTOM_BOOKING_CHANNELS, 6000),
    ]);

  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-clip">
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
        defaultCountryIso2={
          options.find((o) => o.iata === "KUT")?.countryIso2 || options[0]?.countryIso2 || ""
        }
        airports={popularAirports.map((a, index) => ({
          iata: a.iata,
          name: a.title,
          city: a.iata,
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
