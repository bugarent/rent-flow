"use client";

import { useMemo } from "react";
import { usePreferences } from "@/components/providers/preferences-context";
import type { SearchAirportOption } from "@/components/search/airport-search";
import { useHomeCountry } from "@/lib/catalog/home-country-store";
import { countryHeroHeadline, worldHeroHeadline } from "@/lib/seo/country-hero-headline";

/**
 * The page's h1 on the cover: "car rental at airports worldwide" until a country is picked,
 * then that country's title and its main airports.
 */
export function HeroCountryHeadline({ places }: { places: SearchAirportOption[] }) {
  const { locale } = usePreferences();
  const country = useHomeCountry();
  const activeAirports = useMemo(() => {
    const code = country.toUpperCase();
    return places
      .filter((p) => p.countryIso2?.toUpperCase() === code && p.kind === "airport")
      .map((p) => p.iata);
  }, [country, places]);

  const text = countryHeroHeadline(locale, country, activeAirports);
  const [countryTitle, ...rest] = text.split(" — ");
  // Before a country is picked: the worldwide title; Georgia's sentence stays for search engines.
  const title = country ? countryTitle : worldHeroHeadline(locale);
  const subtitle = country ? rest.join(" — ") : "";
  return (
    <div
      key={country || "world"}
      className="mx-auto mb-2.5 w-full rounded-2xl border border-white/15 bg-[#0b1f4b]/55 px-4 py-2.5 text-center shadow-lg backdrop-blur-md motion-safe:animate-[rac-fade-in_.35s_ease-out] sm:mb-3 sm:px-6 sm:py-3"
    >
      <h1 className="text-pretty text-white">
        <span className="block text-base font-extrabold leading-tight tracking-tight sm:text-xl">
          {title}
        </span>
        {country ? null : <span className="sr-only"> — {text}</span>}
        {subtitle ? <span className="sr-only"> — </span> : null}
        {subtitle ? (
          <span className="mt-1 block text-xs font-medium leading-snug text-white/85 sm:text-sm">
            {subtitle}
          </span>
        ) : null}
      </h1>
    </div>
  );
}
