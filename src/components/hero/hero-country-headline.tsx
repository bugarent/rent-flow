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
      className="mx-1 mb-1.5 border-b border-white/15 px-2 pb-2.5 pt-2 text-center motion-safe:animate-[rac-fade-in_.35s_ease-out] sm:mx-2 sm:mb-2 sm:px-4 sm:pt-2.5"
    >
      <h1 className="text-pretty text-white [text-shadow:0_1px_2px_rgba(2,6,23,0.55)]">
        <span className="block text-base font-extrabold leading-tight tracking-tight sm:text-xl">
          {title}
        </span>
        {subtitle ? <span className="sr-only"> — </span> : null}
        {subtitle ? (
          <span className="mt-1 block text-xs font-medium leading-snug text-white/90 sm:text-sm">
            {subtitle}
          </span>
        ) : null}
      </h1>
    </div>
  );
}
