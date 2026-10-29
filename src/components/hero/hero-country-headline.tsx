"use client";

import { useMemo } from "react";
import { usePreferences } from "@/components/providers/preferences-context";
import type { SearchAirportOption } from "@/components/search/airport-search";
import { useHomeCountry } from "@/lib/catalog/home-country-store";
import { placeLabel } from "@/lib/i18n/place-label";
import { countryHeroHeadline } from "@/lib/seo/country-hero-headline";

/** The page's h1: country picked in search + its main tourist places (Georgia until one is picked). */
export function HeroCountryHeadline({ places }: { places: SearchAirportOption[] }) {
  const { locale } = usePreferences();
  const country = useHomeCountry();
  const fallbackPlaces = useMemo(() => {
    const code = country.toUpperCase();
    return places
      .filter((p) => p.countryIso2?.toUpperCase() === code && p.kind === "city")
      .sort((a, b) => (b.carCount ?? 0) - (a.carCount ?? 0))
      .map((p) => placeLabel(locale, p.label).replace(/\s+\([^)]+\)\s*$/, "").trim());
  }, [country, locale, places]);

  return (
    <h1 className="mx-auto mb-3 max-w-3xl text-balance text-center text-lg font-extrabold leading-snug text-white [text-shadow:0_2px_10px_rgba(2,6,23,0.75)] sm:mb-4 sm:text-2xl lg:text-3xl">
      {countryHeroHeadline(locale, country, fallbackPlaces)}
    </h1>
  );
}
