"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PopularAirportCard } from "@/lib/catalog/popular-airports";
import type { PopularAirportsLayout } from "@/lib/catalog/popular-airports-layout";
import { usePreferences } from "@/components/providers/preferences-context";
import { airportCarsLabel } from "@/lib/i18n/airport-cars-label";
import { placeLabel } from "@/lib/i18n/place-label";

const PAGE_SIZE = 3;

function AirportCard({
  airport,
  locale,
}: {
  airport: PopularAirportCard;
  locale: string;
}) {
  const href = `/airport/${encodeURIComponent(airport.iata)}`;
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-40 bg-slate-200 sm:h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={airport.image}
          alt={placeLabel(locale, airport.name)}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="mb-4 text-lg font-bold text-[#0b1f4b]">{placeLabel(locale, airport.name)}</h3>
        <Link
          href={href}
          className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#1d6fe8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1558c0]"
        >
          {airportCarsLabel(locale, airport.iata)}
        </Link>
      </div>
    </article>
  );
}

export function PopularAirports({
  airports,
  layout: _layout = "grid",
}: {
  airports: PopularAirportCard[];
  layout?: PopularAirportsLayout;
}) {
  const { dictionary, locale } = usePreferences();
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(airports.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  const visible = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return airports.slice(start, start + PAGE_SIZE);
  }, [airports, safePage]);

  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;

  return (
    <section id="airports" className="relative w-full min-w-0 overflow-x-clip bg-white px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
          <h2 className="min-w-0 flex-1 text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">
            {dictionary.home.popularAirports}
          </h2>
          {pageCount > 1 ? (
            <div
              className="ml-auto flex shrink-0 items-center gap-2"
              role="group"
              aria-label={dictionary.home.popularAirports}
            >
              <button
                type="button"
                aria-label="Previous airports"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1f4b] shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe8]"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next airports"
                disabled={!canNext}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1f4b] shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe8]"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {visible.map((airport) => (
            <AirportCard
              key={`${airport.iata}-${airport.rank}-${airport.name}-${safePage}`}
              airport={airport}
              locale={locale}
            />
          ))}
        </div>

        {pageCount > 1 ? (
          <p className="mt-4 text-center text-xs font-medium text-slate-500 sm:mt-5">
            {safePage + 1} / {pageCount}
          </p>
        ) : null}
      </div>
    </section>
  );
}
