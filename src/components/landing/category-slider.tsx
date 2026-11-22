"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { CardImage } from "@/components/ui/site-image";
import { requestHomeCategorySearch } from "@/lib/catalog/home-country-store";

const AUTO_MS = 4000;
/** Cards visible side by side on desktop (lg grid). */
const MAX_COLUMNS = 4;
const SLIDE_MS = 650;

type Category = { id: string; slug: string; name: string; details: string; imageUrl: string };

function scrollToHomeSearch() {
  const target = document.getElementById("home-search");
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
}

function CategoryCard({
  category,
  viewLabel,
  loopCopy = false,
}: {
  category: Category;
  viewLabel: string;
  /** Duplicate slide used only for the infinite loop — hidden from assistive tech. */
  loopCopy?: boolean;
}) {
  const { locale } = usePreferences();
  const name = knownText(locale, category.name);
  const openSearch = () => {
    requestHomeCategorySearch(category.slug, name);
    scrollToHomeSearch();
  };

  return (
    <article
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-hidden={loopCopy || undefined}
    >
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        <CardImage src={category.imageUrl} alt={name} />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="mb-4 text-lg font-bold text-[#0b1f4b]">{name}</h3>
        <button
          type="button"
          tabIndex={loopCopy ? -1 : undefined}
          aria-label={`${viewLabel}: ${name}`}
          onClick={openSearch}
          className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#1d6fe8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1558c0]"
        >
          {viewLabel}
        </button>
      </div>
    </article>
  );
}

/**
 * Homepage car categories — same carousel pattern as popular airports
 * (full cards, arrows beside the title, no half-card peek).
 */
export function CategorySlider({ categories }: { categories: Category[] }) {
  const { dictionary, dir } = usePreferences();
  const scroller = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);
  const [paused, setPaused] = useState(false);
  const [lead, setLead] = useState(0);
  const rtl = dir === "rtl";
  const canLoop = categories.length > MAX_COLUMNS;
  const slides = canLoop ? [...categories, ...categories, ...categories] : categories;
  const [overflowing, setOverflowing] = useState(canLoop);

  const metrics = useCallback(() => {
    const node = scroller.current;
    const card = node?.querySelector("article");
    if (!node || !(card instanceof HTMLElement)) {
      return { step: 320, cycle: 320 * Math.max(categories.length, 1) };
    }
    const gap = Number.parseFloat(getComputedStyle(node).columnGap || getComputedStyle(node).gap) || 16;
    const step = card.offsetWidth + gap;
    return { step, cycle: step * categories.length };
  }, [categories.length]);

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
      window.setTimeout(() => {
        normalizeLoop();
        const { cycle, step: s } = metrics();
        if (s > 0 && cycle > 0) {
          const idx = Math.round((alignToCard(node.scrollLeft) - cycle) / s);
          setLead(((idx % categories.length) + categories.length) % categories.length);
        }
        scrolling.current = false;
      }, SLIDE_MS + 50);
    },
    [alignToCard, categories.length, metrics, normalizeLoop, rtl],
  );

  useLayoutEffect(() => {
    applyStart();
    const node = scroller.current;
    if (!node) return;
    const raf = window.requestAnimationFrame(() => applyStart());
    const ro = new ResizeObserver(() => {
      const measure = () => {
        const overflows = node.scrollWidth > node.clientWidth + 4;
        setOverflowing(overflows || canLoop);
      };
      measure();
      if (scrolling.current || !canLoop) return;
      node.scrollLeft = alignToCard(node.scrollLeft);
    });
    ro.observe(node);
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [alignToCard, applyStart, canLoop]);

  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    let timeoutId = 0;
    const start = () => {
      timeoutId = window.setTimeout(() => setMotionReady(true), 12000);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!canLoop || paused || !motionReady) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const id = window.setInterval(() => scrollByCard(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [canLoop, paused, scrollByCard, motionReady]);

  if (categories.length === 0) return null;

  const arrowClass =
    "flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1f4b] shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe8]";

  return (
    <section id="categories" className="relative w-full min-w-0 overflow-x-clip bg-slate-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
          <h2 className="min-w-0 flex-1 text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">
            {dictionary.home.carCategories}
          </h2>
          {overflowing ? (
            <div
              className="ml-auto flex shrink-0 items-center gap-2"
              role="group"
              aria-label={dictionary.home.carCategories}
            >
              <button
                type="button"
                aria-label={`${dictionary.home.carCategories} — previous`}
                onClick={() => scrollByCard(-1)}
                className={arrowClass}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`${dictionary.home.carCategories} — next`}
                onClick={() => scrollByCard(1)}
                className={arrowClass}
              >
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
            onScroll={
              canLoop
                ? undefined
                : (event) => {
                    const step = metrics().step;
                    if (step > 0) setLead(Math.round(Math.abs(event.currentTarget.scrollLeft) / step));
                  }
            }
            className="grid grid-flow-col grid-rows-1 auto-cols-[100%] gap-4 overflow-x-auto pb-1 sm:auto-cols-[calc((100%-1.25rem)/2)] sm:gap-5 lg:auto-cols-[calc((100%-4.5rem)/4)] lg:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((category, index) => (
              <CategoryCard
                key={`${category.id}-${index}`}
                category={category}
                viewLabel={dictionary.home.viewVehicles}
                loopCopy={canLoop && (index < categories.length || index >= categories.length * 2)}
              />
            ))}
          </div>
        </div>

        {overflowing && categories.length > 1 ? (
          <p className="mt-4 text-center text-xs font-medium text-slate-500 sm:mt-5">
            {lead + 1} / {categories.length}
          </p>
        ) : null}
      </div>
    </section>
  );
}
