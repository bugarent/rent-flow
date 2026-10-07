"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PopularAirportCard } from "@/lib/catalog/popular-airports";
import type { PopularAirportsLayout } from "@/lib/catalog/popular-airports-layout";
import { usePreferences } from "@/components/providers/preferences-context";
import { airportCarsLabel } from "@/lib/i18n/airport-cars-label";
import { localizedAirportTitle } from "@/lib/catalog/homepage-airport-i18n";

const AUTO_MS = 4000;
const SLIDE_MS = 650;

function AirportCard({
  airport,
  locale,
  loopCopy = false,
}: {
  airport: PopularAirportCard;
  locale: string;
  /** Duplicate slide used only for the infinite loop — hidden from assistive tech. */
  loopCopy?: boolean;
}) {
  const href = `/airport/${encodeURIComponent(airport.iata)}`;
  return (
    <article
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-hidden={loopCopy || undefined}
    >
      <div className="h-40 bg-slate-200 sm:h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={airport.image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="mb-4 text-lg font-bold text-[#0b1f4b]">
          {localizedAirportTitle(
            { iata: airport.iata, title: airport.name, translations: airport.translations },
            locale,
          )}
        </h3>
        <Link
          href={href}
          tabIndex={loopCopy ? -1 : undefined}
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
  const { dictionary, locale, dir } = usePreferences();
  const scroller = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);
  const [paused, setPaused] = useState(false);
  const [lead, setLead] = useState(0);
  const rtl = dir === "rtl";
  const canLoop = airports.length > 1;
  const slides = canLoop ? [...airports, ...airports, ...airports] : airports;

  const metrics = useCallback(() => {
    const node = scroller.current;
    const card = node?.querySelector("article");
    if (!node || !(card instanceof HTMLElement)) {
      return { step: 320, cycle: 320 * Math.max(airports.length, 1) };
    }
    const gap = Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 16;
    const step = card.offsetWidth + gap;
    return { step, cycle: step * airports.length };
  }, [airports.length]);

  const alignToCard = useCallback(
    (scrollLeft: number) => {
      const { cycle, step } = metrics();
      if (cycle <= 0 || step <= 0) return scrollLeft;
      let x = scrollLeft;
      const min = cycle;
      const max = cycle * 2;
      while (x >= max) x -= cycle;
      while (x < min) x += cycle;
      const index = Math.round((x - min) / step);
      return min + index * step;
    },
    [metrics],
  );

  const applyStart = useCallback(() => {
    const node = scroller.current;
    if (!node || !canLoop) return;
    node.scrollLeft = metrics().cycle;
  }, [canLoop, metrics]);

  const normalizeLoop = useCallback(() => {
    const node = scroller.current;
    if (!node || !canLoop) return;
    node.scrollLeft = alignToCard(node.scrollLeft);
  }, [alignToCard, canLoop]);

  const scrollByCard = useCallback(
    (dirStep: -1 | 1) => {
      const node = scroller.current;
      if (!node || scrolling.current) return;
      scrolling.current = true;
      const { step } = metrics();
      node.scrollBy({ left: step * dirStep * (rtl ? -1 : 1), behavior: "smooth" });
      setLead((current) => (current + dirStep + airports.length) % airports.length);
      window.setTimeout(() => {
        normalizeLoop();
        scrolling.current = false;
      }, SLIDE_MS + 50);
    },
    [airports.length, metrics, normalizeLoop, rtl],
  );

  useLayoutEffect(() => {
    applyStart();
    const node = scroller.current;
    if (!node) return;
    const raf = window.requestAnimationFrame(() => applyStart());
    const ro = new ResizeObserver(() => {
      if (scrolling.current || !canLoop) return;
      node.scrollLeft = alignToCard(node.scrollLeft);
    });
    ro.observe(node);
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [alignToCard, applyStart, canLoop]);

  useEffect(() => {
    if (!canLoop || paused) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const id = window.setInterval(() => scrollByCard(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [canLoop, paused, scrollByCard]);

  const arrowClass =
    "flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1f4b] shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe8]";

  return (
    <section id="airports" className="relative w-full min-w-0 overflow-x-clip bg-white px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
          <h2 className="min-w-0 flex-1 text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">
            {dictionary.home.popularAirports}
          </h2>
          {canLoop ? (
            <div
              className="ml-auto flex shrink-0 items-center gap-2"
              role="group"
              aria-label={dictionary.home.popularAirports}
            >
              <button type="button" aria-label="Previous airports" onClick={() => scrollByCard(-1)} className={arrowClass}>
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" aria-label="Next airports" onClick={() => scrollByCard(1)} className={arrowClass}>
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            ref={scroller}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerCancel={() => setPaused(false)}
            className="grid grid-flow-col grid-rows-1 auto-cols-[100%] gap-4 overflow-x-auto pb-1 sm:auto-cols-[calc((100%-1.25rem)/2)] sm:gap-5 lg:auto-cols-[calc((100%-3rem)/3)] lg:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((airport, index) => (
              <AirportCard
                key={`${airport.iata}-${airport.rank}-${index}`}
                airport={airport}
                locale={locale}
                loopCopy={canLoop && (index < airports.length || index >= airports.length * 2)}
              />
            ))}
          </div>
        </div>

        {canLoop ? (
          <p className="mt-4 text-center text-xs font-medium text-slate-500 sm:mt-5">
            {lead + 1} / {airports.length}
          </p>
        ) : null}
      </div>
    </section>
  );
}
