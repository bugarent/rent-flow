"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { defaultSearchDateRange } from "@/lib/catalog/default-search-dates";
import { useHomeCountry } from "@/lib/catalog/home-country-store";

const AUTO_MS = 4000;
const SLIDE_MS = 600;

type Category = { id: string; slug: string; name: string; details: string; imageUrl: string };

function CategoryCard({
  category,
  viewLabel,
}: {
  category: Category;
  viewLabel: string;
}) {
  const { locale } = usePreferences();
  const country = useHomeCountry();
  const { startDate, endDate } = defaultSearchDateRange();
  const name = knownText(locale, category.name);
  const href = `/cars?category=${encodeURIComponent(category.slug)}${country ? `&country=${encodeURIComponent(country)}` : ""}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-36 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={category.imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-3 text-lg font-bold text-[#0b1f4b]">{name}</h3>
        <Link
          href={href}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#1d6fe8] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#1558c0]"
        >
          {viewLabel}
        </Link>
      </div>
    </article>
  );
}

export function CategorySlider({ categories }: { categories: Category[] }) {
  const { dictionary, dir } = usePreferences();
  const scroller = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);
  const [paused, setPaused] = useState(false);
  const rtl = dir === "rtl";
  const canLoop = categories.length > 1;
  const slides = canLoop ? [...categories, ...categories, ...categories] : categories;

  const metrics = useCallback(() => {
    const node = scroller.current;
    const card = node?.querySelector("article");
    if (!node || !(card instanceof HTMLElement)) {
      return { step: 280, peek: 140, cycle: 280 * Math.max(categories.length, 1) };
    }
    const gap = Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 16;
    const step = card.offsetWidth + gap;
    return {
      step,
      peek: card.offsetWidth / 2,
      cycle: step * categories.length,
    };
  }, [categories.length]);

  const alignToPeek = useCallback(
    (scrollLeft: number) => {
      const { peek, cycle, step } = metrics();
      if (cycle <= 0 || step <= 0) return scrollLeft;
      let x = scrollLeft;
      const min = cycle - peek;
      const max = cycle * 2 - peek;
      while (x >= max) x -= cycle;
      while (x < min) x += cycle;
      const index = Math.round((x - min) / step);
      return min + index * step;
    },
    [metrics],
  );

  const applyPeekStart = useCallback(() => {
    const node = scroller.current;
    if (!node || !canLoop) return;
    const { peek, cycle } = metrics();
    node.scrollLeft = cycle - peek;
  }, [canLoop, metrics]);

  const normalizeLoop = useCallback(() => {
    const node = scroller.current;
    if (!node || !canLoop) return;
    node.scrollLeft = alignToPeek(node.scrollLeft);
  }, [alignToPeek, canLoop]);

  const scrollByCard = useCallback(
    (dirStep: -1 | 1) => {
      const node = scroller.current;
      if (!node || scrolling.current) return;
      scrolling.current = true;
      const { step } = metrics();
      node.scrollBy({ left: step * dirStep * (rtl ? -1 : 1), behavior: "smooth" });
      window.setTimeout(() => {
        normalizeLoop();
        scrolling.current = false;
      }, SLIDE_MS + 50);
    },
    [metrics, normalizeLoop, rtl],
  );

  useLayoutEffect(() => {
    applyPeekStart();
    const node = scroller.current;
    if (!node) return;
    const raf = window.requestAnimationFrame(() => applyPeekStart());
    const ro = new ResizeObserver(() => {
      if (scrolling.current || !canLoop) return;
      node.scrollLeft = alignToPeek(node.scrollLeft);
    });
    ro.observe(node);
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [alignToPeek, applyPeekStart, canLoop]);

  useEffect(() => {
    if (!canLoop || paused) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const id = window.setInterval(() => scrollByCard(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [canLoop, paused, scrollByCard]);

  if (categories.length === 0) return null;

  const arrowClass =
    "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1f4b] shadow-lg transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe8]";

  return (
    <section id="categories" className="relative w-full overflow-x-clip bg-slate-50 px-4 pb-4 pt-3 sm:pb-5 sm:pt-4">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-5 text-center text-2xl font-extrabold text-[#0b1f4b] sm:mb-6 sm:text-3xl">
          {dictionary.home.carCategories}
        </h2>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={scroller}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerCancel={() => setPaused(false)}
            className="grid grid-flow-col grid-rows-1 auto-cols-[calc((100%-1rem)/2)] gap-4 overflow-x-auto pb-2 sm:auto-cols-[calc((100%-2rem)/3)] lg:auto-cols-[calc((100%-4rem)/5)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((category, index) => (
              <CategoryCard
                key={`${category.id}-${index}`}
                category={category}
                viewLabel={dictionary.home.viewVehicles}
              />
            ))}
          </div>

          {canLoop ? (
            <>
              <button
                type="button"
                aria-label={dictionary.home.carCategories}
                onClick={() => scrollByCard(-1)}
                className={`${arrowClass} left-5 sm:left-7`}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={dictionary.home.carCategories}
                onClick={() => scrollByCard(1)}
                className={`${arrowClass} right-5 sm:right-7`}
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
