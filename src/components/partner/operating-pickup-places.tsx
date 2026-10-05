"use client";

import { useMemo, useState } from "react";
import { CountryFlag } from "@/components/ui/country-flag";
import { searchPlacesForCountry, type SearchPlace } from "@/lib/catalog/search-places";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";
import { cn } from "@/lib/utils";

function matchesPlace(place: SearchPlace, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    place.label.toLowerCase().includes(q) ||
    place.cityName.toLowerCase().includes(q) ||
    place.name.toLowerCase().includes(q) ||
    (place.iata || "").toLowerCase().includes(q)
  );
}

export function OperatingPickupPlaces({
  countryIso2s,
  locationCodes,
  onChange,
  invalid = false,
}: {
  countryIso2s: string[];
  locationCodes: string[];
  onChange: (codes: string[]) => void;
  invalid?: boolean;
}) {
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(locationCodes), [locationCodes]);

  const groups = useMemo(
    () =>
      countryIso2s.map((iso2) => {
        const places = searchPlacesForCountry(iso2).filter((place) => matchesPlace(place, query));
        return {
          iso2,
          name: worldCountryName(iso2),
          airports: places.filter((place) => place.kind === "airport"),
          cities: places.filter((place) => place.kind === "city"),
        };
      }),
    [countryIso2s, query],
  );

  const toggle = (code: string) => {
    onChange(selected.has(code) ? locationCodes.filter((item) => item !== code) : [...locationCodes, code]);
  };

  const renderPlaces = (places: SearchPlace[]) => (
    <ul className="space-y-1">
      {places.map((place) => (
        <li key={place.code}>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0"
              checked={selected.has(place.code)}
              onChange={() => toggle(place.code)}
            />
            <span className="min-w-0 break-words">{place.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        invalid ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200 bg-white",
      )}
    >
      <p className="text-sm font-semibold text-slate-800">
        {t.pickupPlaces} <span className="text-red-500">*</span>
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{t.pickupPlacesHint}</p>
      {countryIso2s.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{t.pickupPlacesEmpty}</p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.pickupSearch}
            aria-label={t.pickupSearch}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-sky-400"
          />
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
            {groups.map((group) => (
              <section key={group.iso2} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CountryFlag iso2={group.iso2} />
                  {group.name}
                </p>
                {group.airports.length === 0 && group.cities.length === 0 ? (
                  <p className="text-xs text-slate-500">{t.pickupPlacesEmpty}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {t.pickupAirports}
                      </p>
                      {group.airports.length ? renderPlaces(group.airports) : (
                        <p className="text-xs text-slate-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {t.pickupCities}
                      </p>
                      {group.cities.length ? renderPlaces(group.cities) : (
                        <p className="text-xs text-slate-400">—</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
