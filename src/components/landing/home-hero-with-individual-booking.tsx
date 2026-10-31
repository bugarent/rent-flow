"use client";

import { AirportHero } from "@/components/hero/airport-hero";
import type { SearchAirportOption } from "@/components/search/airport-search";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";

export function HomeHeroWithIndividualBooking({
  airports,
  channels,
  popularIatas,
}: {
  airports: SearchAirportOption[];
  channels: CustomBookingChannelsConfig;
  popularIatas?: string[];
}) {
  return (
    <AirportHero airports={airports} customBookingChannels={channels} popularIatas={popularIatas} />
  );
}
