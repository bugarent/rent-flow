"use client";

import { AirportSearch, type SearchAirportOption } from "@/components/search/airport-search";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";

export function AirportHero({
  airports,
  onPickupChange,
  customBookingChannels,
  popularIatas,
}: {
  airports: SearchAirportOption[];
  onPickupChange?: (pickupIata: string) => void;
  customBookingChannels?: CustomBookingChannelsConfig;
  popularIatas?: string[];
}) {
  return (
    <section className="relative isolate w-full overflow-x-clip bg-[#0b1f4b]">
      <picture>
        {/* Static WebP, not the image optimizer, so the first photo is one CDN file. */}
        <source media="(max-width: 828px)" srcSet="/images/hero-tarmac-sm.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-tarmac.webp"
          alt=""
          width={1600}
          height={900}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden
        />
      </picture>
      <div className="absolute inset-0 bg-slate-950/15" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center px-3 pb-[calc(1.5rem+1.5cm)] pt-[calc(8.25rem+0.5cm)] sm:px-4 sm:pb-[calc(2rem+1.5cm)] sm:pt-[calc(6rem+0.5cm)] lg:px-6 lg:pt-[calc(6.5rem+0.5cm)]">
        <div className="w-full min-w-0 max-w-[calc(680px+4cm)]">
          <AirportSearch
            options={airports}
            onPickupChange={onPickupChange}
            customBookingChannels={customBookingChannels}
            popularIatas={popularIatas}
          />
        </div>
      </div>
    </section>
  );
}
