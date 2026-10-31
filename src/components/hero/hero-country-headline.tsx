"use client";

import { useMemo } from "react";
import { usePreferences } from "@/components/providers/preferences-context";
import type { SearchAirportOption } from "@/components/search/airport-search";
import { useHomeCountry } from "@/lib/catalog/home-country-store";
import { placeLabel } from "@/lib/i18n/place-label";
import { countryHeroHeadline } from "@/lib/seo/country-hero-headline";

/**
 * The page's h1. Before a country is picked it is screen-reader / crawler only (Georgia text);
 * once one is picked it shows on the cover as a title and the country's main places.
 */
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

  const text = countryHeroHeadline(locale, country, fallbackPlaces);
  if (!country) return <h1 className="sr-only">{text}</h1>;

  const [title, ...rest] = text.split(" — ");
  const subtitle = rest.join(" — ");
  return (
    <div
      key={country}
      className="mx-auto mb-2.5 w-full rounded-2xl border border-white/15 bg-[#0b1f4b]/55 px-4 py-2.5 text-center shadow-lg backdrop-blur-md motion-safe:animate-[rac-fade-in_.35s_ease-out] sm:mb-3 sm:px-6 sm:py-3"
    >
      <h1 className="text-pretty text-white">
        <span className="block text-base font-extrabold leading-tight tracking-tight sm:text-xl">
          {title}
        </span>
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
