import "server-only";

import { cachedPublicRead } from "@/lib/server/public-data-cache";
import { getSearchDeliveryAirports } from "@/lib/server/delivery-locations";
import {
  getHomepageAirports,
  getHomepageCategories,
  getPopularAirportsLayoutSetting,
} from "@/lib/server/homepage";
import { getHomepageInfoContent } from "@/lib/server/homepage-info-blocks-store";
import { getPublicHomepageGoogleReviews } from "@/lib/server/homepage-google-reviews-store";
import { getPublicCustomBookingChannels } from "@/lib/server/custom-booking-channels-store";
import { getPublicFooterContact } from "@/lib/server/footer-contact-store";
import { getFxRates } from "@/lib/server/preferences";

const nonEmpty = (rows: unknown[]) => rows.length > 0;

export const cachedSearchDeliveryAirports = cachedPublicRead(
  "search-delivery-airports:listing-place",
  getSearchDeliveryAirports,
  { keep: nonEmpty },
);
export const cachedHomepageAirports = cachedPublicRead("homepage-airports", getHomepageAirports, {
  keep: nonEmpty,
});
export const cachedHomepageCategories = cachedPublicRead(
  "homepage-categories",
  getHomepageCategories,
  { keep: nonEmpty },
);
export const cachedPopularAirportsLayout = cachedPublicRead(
  "popular-airports-layout",
  getPopularAirportsLayoutSetting,
);
export const cachedHomepageInfoContent = cachedPublicRead("homepage-info", getHomepageInfoContent);
export const cachedHomepageGoogleReviews = cachedPublicRead(
  "homepage-google-reviews",
  getPublicHomepageGoogleReviews,
);
export const cachedCustomBookingChannels = cachedPublicRead(
  "custom-booking-channels",
  getPublicCustomBookingChannels,
);
export const cachedFooterContact = cachedPublicRead("footer-contact", getPublicFooterContact);
export const cachedFxRates = cachedPublicRead("fx-rates", getFxRates, { revalidate: 3600 });
