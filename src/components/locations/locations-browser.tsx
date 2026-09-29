"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Home, Search } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { usePreferences } from "@/components/providers/preferences-context";
import {
  LOCATION_ALPHABET,
  groupCountriesByLetter,
  type LocationCountrySummary,
} from "@/lib/locations/group-active-countries";
import { cn } from "@/lib/utils";

export function LocationsBrowser({ countries }: { countries: LocationCountrySummary[] }) {
  const { dictionary } = usePreferences();
  const t = dictionary.locationsPage;
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = countries;
    if (q) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q),
      );
    }
    if (activeLetter) {
      list = list.filter((c) => c.letter === activeLetter);
    }
    return list;
  }, [countries, query, activeLetter]);

  const groups = useMemo(() => groupCountriesByLetter(filtered), [filtered]);
  const lettersWithData = useMemo(
    () => new Set(countries.map((c) => c.letter)),
    [countries],
  );

  return (
    <div className="bg-[#f4f6f9]">
      <section className="relative overflow-hidden bg-[#0b1f4b]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=60)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{t.subtitle}</p>
          <label className="relative mx-auto mt-8 block max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveLetter(null);
              }}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-full border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-lg outline-none ring-1 ring-black/5 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400"
            />
          </label>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <nav className="mb-5 flex items-center gap-1.5 text-sm text-sky-700">
          <Link href="/" className="inline-flex items-center gap-1 hover:underline">
            <Home className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <span className="text-slate-400">&gt;</span>
          <span className="font-medium">{t.title}</span>
        </nav>

        <div className="mb-8 flex flex-wrap gap-x-2 gap-y-1">
          {LOCATION_ALPHABET.map((letter) => {
            const enabled = lettersWithData.has(letter);
            const active = activeLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                disabled={!enabled}
                onClick={() => setActiveLetter(active ? null : letter)}
                className={cn(
                  "min-w-[1.25rem] text-sm font-semibold",
                  !enabled && "cursor-default text-slate-300",
                  enabled && !active && "text-slate-600 hover:text-sky-700",
                  active && "text-sky-700 underline underline-offset-4",
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {t.empty}
          </p>
        ) : (
          <div className="space-y-10">
            {groups.map(([letter, rows]) => (
              <section key={letter} id={`loc-${letter}`}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-3xl font-extrabold text-slate-900">{letter}</h2>
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                    {t.countriesBadge.replace("{n}", String(rows.length))}
                  </span>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rows.map((country) => (
                    <li key={country.iso2}>
                      <Link
                        href={`/cars?country=${country.iso2}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                      >
                        <CountryFlag iso2={country.iso2} className="h-5 w-7 rounded-sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">
                            {country.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {t.metaLine
                              .replace("{cities}", String(country.cityCount))
                              .replace("{locations}", String(country.locationCount))}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
