import { HomeHeroWithIndividualBooking } from "@/components/landing/home-hero-with-individual-booking";
import { CategorySlider } from "@/components/landing/category-slider";
import { PopularAirports } from "@/components/landing/popular-airports";
import { GoogleReviewsCarousel } from "@/components/landing/google-reviews-carousel";
import { HowItWorksPanel, WhyChooseUsPanel } from "@/components/landing/why-and-how";
import {
  getHomepageAirports,
  getHomepageCategories,
  getPopularAirportsLayoutSetting,
} from "@/lib/server/homepage";
import { getSearchDeliveryAirports } from "@/lib/server/delivery-locations";
import {
  defaultHomepageInfoContent,
  getHomepageInfoContent,
} from "@/lib/server/homepage-info-blocks-store";
import { getPublicHomepageGoogleReviews } from "@/lib/server/homepage-google-reviews-store";
import { getPublicCustomBookingChannels } from "@/lib/server/custom-booking-channels-store";
import { DEFAULT_CUSTOM_BOOKING_CHANNELS } from "@/lib/catalog/custom-booking-channels";
import { softTimeout } from "@/lib/server/soft-timeout";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";

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
      softTimeout(getSearchDeliveryAirports(), [], 2000),
      softTimeout(getHomepageAirports(), airportFallback, 2000),
      softTimeout(getHomepageCategories(), categoryFallback, 2000),
      softTimeout(getPopularAirportsLayoutSetting(), "grid" as const, 1500),
      softTimeout(getHomepageInfoContent(), defaultHomepageInfoContent(), 1500),
      softTimeout(getPublicHomepageGoogleReviews(), null, 1500),
      softTimeout(getPublicCustomBookingChannels(), DEFAULT_CUSTOM_BOOKING_CHANNELS, 1500),
    ]);

  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-clip">
      <HomeHeroWithIndividualBooking airports={options} channels={bookingChannels} />
      <CategorySlider categories={categories} />
      <HowItWorksPanel content={infoContent} />
      <PopularAirports
        layout={airportsLayout}
        airports={popularAirports.map((a, index) => ({
          iata: a.iata,
          name: a.title,
          city: a.iata,
          image: a.imageUrl,
          rank: index + 1,
        }))}
      />
      <WhyChooseUsPanel content={infoContent} />
      {googleReviews ? <GoogleReviewsCarousel {...googleReviews} /> : null}
    </div>
  );
}
