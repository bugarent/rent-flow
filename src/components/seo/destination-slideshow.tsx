"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PAGE_SIZE = 15;
const ROTATE_MS = 5000;

export type DestinationSlide = { href: string; label: string };

/** Shows 15 active places at a time and rotates in the ones that are off-screen. */
export function DestinationSlideshow({
  title,
  items,
}: {
  title: string;
  items: DestinationSlide[];
}) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (pages < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setPage((current) => (current + 1) % pages);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [pages, paused]);

  if (!items.length) return null;

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12"
      aria-labelledby="seo-home-destinations"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h2 id="seo-home-destinations" className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <ul
        key={page}
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 motion-safe:animate-[rac-fade-in_0.45s_ease-out]"
      >
        {items.map((item, index) => {
          const visible = Math.floor(index / PAGE_SIZE) === page;
          return (
            <li key={item.href} className={visible ? "min-w-0" : "hidden"} aria-hidden={visible ? undefined : true}>
              <Link
                href={item.href}
                tabIndex={visible ? undefined : -1}
                className="inline-flex min-h-11 w-full items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-sky-900 hover:bg-sky-50"
              >
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {pages > 1 ? (
        <p className="mt-3 text-center text-xs font-medium text-slate-400">
          {page + 1} / {pages}
        </p>
      ) : null}
    </section>
  );
}
