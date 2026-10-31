"use client";

import { AirportSearch, type SearchAirportOption } from "@/components/search/airport-search";
import { HeroCountryHeadline } from "@/components/hero/hero-country-headline";
import { HeroCountryCover } from "@/components/hero/hero-country-cover";
import type { CustomBookingChannelsConfig } from "@/lib/catalog/custom-booking-channels";
import { BUILT_IN_COUNTRY_COVERS, type CountryCoverMap } from "@/lib/catalog/country-covers";

export function AirportHero({
  airports,
  onPickupChange,
  customBookingChannels,
  popularIatas,
  countryCovers = BUILT_IN_COUNTRY_COVERS,
}: {
  airports: SearchAirportOption[];
  onPickupChange?: (pickupIata: string) => void;
  customBookingChannels?: CustomBookingChannelsConfig;
  popularIatas?: string[];
  countryCovers?: CountryCoverMap;
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
      <HeroCountryCover covers={countryCovers} />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center px-3 pb-[calc(1.5rem+1.5cm)] pt-[calc(8.25rem+0.5cm)] sm:px-4 sm:pb-[calc(2rem+1.5cm)] sm:pt-[calc(6rem+0.5cm)] lg:px-6 lg:pt-[calc(6.5rem+0.5cm)]">
        {/* One frosted-glass card for the country title and the search form, shown before a country is picked too. */}
        <div className="w-full min-w-0 max-w-[calc(680px+4cm)] rounded-[1.25rem] border border-white/20 bg-slate-950/45 p-1.5 shadow-[0_24px_60px_-18px_rgba(2,6,23,0.75)] ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 sm:rounded-3xl sm:p-2">
          <HeroCountryHeadline places={airports} />
          <AirportSearch
            options={airports}
            onPickupChange={onPickupChange}
            customBookingChannels={customBookingChannels}
            popularIatas={popularIatas}
            surface="glass"
          />
        </div>
      </div>
    </section>
  );
}
