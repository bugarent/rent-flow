"use client";

import { HERO_BACKGROUND_URL } from "@/lib/brand";
import { AirportSearch, type SearchAirportOption } from "@/components/search/airport-search";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";

export function AirportHero({
  airports,
  onPickupChange,
  customBookingChannels,
}: {
  airports: SearchAirportOption[];
  onPickupChange?: (pickupIata: string) => void;
  customBookingChannels?: CustomBookingChannelsConfig;
}) {
  return (
    <section className="relative isolate w-full overflow-x-clip">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${HERO_BACKGROUND_URL}')` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-slate-950/15" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center px-3 pb-[calc(1.5rem+1.5cm)] pt-[calc(8.25rem+0.5cm)] sm:px-4 sm:pb-[calc(2rem+1.5cm)] sm:pt-[calc(6rem+0.5cm)] lg:px-6 lg:pt-[calc(6.5rem+0.5cm)]">
        <div className="w-full min-w-0 max-w-[calc(680px+4cm)]">
          <AirportSearch
            options={airports}
            onPickupChange={onPickupChange}
            customBookingChannels={customBookingChannels}
          />
        </div>
      </div>
    </section>
  );
}
