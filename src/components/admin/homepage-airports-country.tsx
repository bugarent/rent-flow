"use client";

import { useMemo } from "react";
import {
  airportCountryIso2,
  airportsForCountry,
  findSearchPlace,
  searchPlacesForCountry,
  type SearchPlace,
} from "@/lib/catalog/search-places";
import { placeLabel } from "@/lib/i18n/place-label";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";

type CardLike = { id: string; iata: string };

const COPY: Record<
  string,
  {
    country: string;
    countryHelp: string;
    airport: string;
    pickAirport: string;
    airports: string;
    cities: string;
    empty: string;
  }
> = {
  ka: {
    country: "ქვეყანა",
    countryHelp: "მთავარ გვერდზე ეს ბარათები ჩანს, როცა ძებნაში ეს ქვეყანაა არჩეული.",
    airport: "აეროპორტი ან ქალაქი",
    pickAirport: "აირჩიეთ აეროპორტი ან ქალაქი",
    airports: "აეროპორტები",
    cities: "ქალაქები",
    empty: "ამ ქვეყნისთვის ბარათი ჯერ არ არის — მთავარ გვერდზე სექცია ცარიელი ჩანს. დაამატეთ ქვემოთ.",
  },
  ru: {
    country: "Страна",
    countryHelp: "На главной эти карточки видны, когда в поиске выбрана эта страна.",
    airport: "Аэропорт или город",
    pickAirport: "Выберите аэропорт или город",
    airports: "Аэропорты",
    cities: "Города",
    empty: "Для этой страны карточек пока нет — на главной раздел будет пустым. Добавьте ниже.",
  },
  en: {
    country: "Country",
    countryHelp: "These cards show on the homepage when this country is selected in search.",
    airport: "Airport or city",
    pickAirport: "Select an airport or a city",
    airports: "Airports",
    cities: "Cities",
    empty: "No cards for this country yet — the homepage section shows empty. Add one below.",
  },
};

export function airportsCountryCopy(locale: string) {
  return COPY[locale] ?? COPY.en;
}

/** Cards of one country, in their saved order. */
export function cardsForCountry<T extends CardLike>(cards: T[], iso2: string): T[] {
  return cards.filter((card) => airportCountryIso2(card.iata) === iso2);
}

/** Put a reordered country subset back into the full list, keeping other countries' slots. */
export function mergeCountryOrder<T extends CardLike>(all: T[], iso2: string, reordered: T[]): T[] {
  const queue = [...reordered];
  return all.map((card) => (airportCountryIso2(card.iata) === iso2 ? (queue.shift() ?? card) : card));
}

/** Country picker shown next to the "Popular airports" title. */
export function AirportCountrySelect({
  value,
  cards,
  locale,
  onChange,
}: {
  value: string;
  cards: CardLike[];
  locale: string;
  onChange: (iso2: string) => void;
}) {
  const t = airportsCountryCopy(locale);
  const options = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      const iso = airportCountryIso2(card.iata);
      if (iso) counts.set(iso, (counts.get(iso) ?? 0) + 1);
    }
    return WORLD_COUNTRIES.map((c) => c.iso2.toUpperCase())
      .filter((iso) => airportsForCountry(iso).length > 0)
      .map((iso) => ({ iso, name: worldCountryName(iso), count: counts.get(iso) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [cards]);

  return (
    <label className="block min-w-0 text-[11px] font-semibold text-slate-600">
      {t.country}
      <select
        className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-base font-semibold text-[#0b1f4b] sm:min-w-[220px] sm:text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((o) => (
          <option key={o.iso} value={o.iso}>
            {o.name}
            {o.count ? ` (${o.count})` : ""}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-[10px] font-normal text-slate-500">{t.countryHelp}</span>
    </label>
  );
}

function placeOptionLabel(locale: string, place: SearchPlace): string {
  return placeLabel(locale, place.label);
}

/** Title suggested for a new card: the place's own name, never another airport's. */
export function suggestedCardTitle(locale: string, place: SearchPlace): string {
  const label = placeOptionLabel(locale, place);
  if (place.kind === "city") return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
  return label;
}

/** Short caption under an admin card. Cities show the city name, airports the code. */
export function cardPlaceCaption(code: string, locale: string): string {
  const place = findSearchPlace(code);
  if (!place) return code;
  if (place.kind === "city") return suggestedCardTitle(locale, place) || code;
  return place.iata || code;
}

/** Airport or city of the selected country. A city saves on its own, without an airport. */
export function CountryAirportSelect({
  country,
  value,
  locale,
  onChange,
}: {
  country: string;
  value: string;
  locale: string;
  onChange: (code: string, label: string) => void;
}) {
  const t = airportsCountryCopy(locale);
  const places = useMemo(() => searchPlacesForCountry(country), [country]);
  const airports = places.filter((place) => place.kind === "airport");
  const cities = places.filter((place) => place.kind === "city");
  const byLabel = (a: SearchPlace, b: SearchPlace) =>
    placeOptionLabel(locale, a).localeCompare(placeOptionLabel(locale, b), locale);
  const current = value.trim().toUpperCase();
  const known = places.some((place) => place.code.toUpperCase() === current);
  return (
    <label className="block text-xs font-bold text-[#0b1f4b]">
      {t.airport}
      <select
        required
        className="mt-1 w-full rounded-lg border bg-white p-2 text-base font-normal sm:text-xs"
        value={known ? current : ""}
        onChange={(event) => {
          const place = places.find((item) => item.code.toUpperCase() === event.target.value);
          onChange(event.target.value, place ? suggestedCardTitle(locale, place) : "");
        }}
      >
        <option value="">{t.pickAirport}</option>
        {airports.length ? (
          <optgroup label={t.airports}>
            {[...airports].sort(byLabel).map((place) => (
              <option key={place.code} value={place.code.toUpperCase()}>
                {placeOptionLabel(locale, place)}
              </option>
            ))}
          </optgroup>
        ) : null}
        {cities.length ? (
          <optgroup label={t.cities}>
            {[...cities].sort(byLabel).map((place) => (
              <option key={place.code} value={place.code.toUpperCase()}>
                {placeOptionLabel(locale, place)}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}
