"use client";

import { AirportHero } from "@/components/hero/airport-hero";
import type { SearchAirportOption } from "@/components/search/airport-search";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";
import type { CountryCoverMap } from "@/lib/catalog/country-covers";

export function HomeHeroWithIndividualBooking({
  airports,
  channels,
  popularIatas,
  countryCovers,
}: {
  airports: SearchAirportOption[];
  channels: CustomBookingChannelsConfig;
  popularIatas?: string[];
  countryCovers?: CountryCoverMap;
}) {
  return (
    <AirportHero
      airports={airports}
      customBookingChannels={channels}
      popularIatas={popularIatas}
      countryCovers={countryCovers}
    />
  );
}
