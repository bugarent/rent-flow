"use client";

import { useEffect, useRef, useState } from "react";
import type { CountryCoverMap } from "@/lib/catalog/country-covers";
import { useHomeCountry } from "@/lib/catalog/home-country-store";
import { cn } from "@/lib/utils";

const PHONE_MEDIA = "(max-width: 639px)";
/** Before the visitor touches the search, only recently shown covers stay mounted. */
const KEEP_MOUNTED = 3;
const WARM_EVENTS = ["pointerover", "pointerdown", "touchstart", "focusin"] as const;

/**
 * Landmark photo for the picked country, layered over the default hero photo.
 * Nothing loads on first paint (LCP untouched); once the visitor starts using the search every
 * cover is fetched in the background, so the picked country's photo is ready when chosen.
 */
export function HeroCountryCover({ covers }: { covers: CountryCoverMap }) {
  const country = useHomeCountry();
  const active = country && covers[country] ? country : "";
  const [mounted, setMounted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [warm, setWarm] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hero = anchorRef.current?.closest("section");
    if (!hero || warm) return;
    const start = () => setWarm(true);
    for (const type of WARM_EVENTS) hero.addEventListener(type, start, { once: true, passive: true });
    return () => {
      for (const type of WARM_EVENTS) hero.removeEventListener(type, start);
    };
  }, [warm]);

  if (active && !mounted.includes(active)) {
    setMounted([...mounted.filter((iso) => iso !== active), active].slice(-KEEP_MOUNTED));
  }

  const markLoaded = (iso: string) =>
    setLoaded((prev) => (prev.includes(iso) ? prev : [...prev, iso]));
  const showing = Boolean(active && loaded.includes(active));
  const rendered = warm ? [...new Set([...mounted, ...Object.keys(covers)])] : mounted;

  return (
    <>
      <span ref={anchorRef} hidden />
      {rendered.map((iso) => {
        const cover = covers[iso];
        if (!cover) return null;
        const visible = iso === active && loaded.includes(iso);
        return (
          <picture key={`${iso}:${cover.webp}`}>
            {cover.mobileAvif ? <source media={PHONE_MEDIA} srcSet={cover.mobileAvif} type="image/avif" /> : null}
            <source media={PHONE_MEDIA} srcSet={cover.mobileWebp} type="image/webp" />
            {cover.avif ? <source srcSet={cover.avif} type="image/avif" /> : null}
            <img
              ref={(img) => {
                if (img?.complete && img.naturalWidth > 0) markLoaded(iso);
              }}
              src={cover.webp}
              alt=""
              width={cover.width}
              height={cover.height}
              decoding="async"
              fetchPriority={iso === active ? "high" : "low"}
              onLoad={() => markLoaded(iso)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out",
                visible && "opacity-100",
              )}
              style={{ objectPosition: `${Math.round(cover.focalX * 100)}% 50%` }}
              aria-hidden
            />
          </picture>
        );
      })}
      {showing && covers[active]?.credit ? (
        <a
          href={covers[active].credit!.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="absolute bottom-1.5 right-2 z-20 max-w-[70%] truncate rounded bg-slate-950/35 px-1.5 py-0.5 text-[10px] text-white/80 hover:text-white"
        >
          Photo: {covers[active].credit!.author} · {covers[active].credit!.license} · Wikimedia Commons
        </a>
      ) : null}
      {/* Darkens bright landmark photos so the glass card and white text keep their contrast. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/15 to-slate-950/60 opacity-0 motion-safe:transition-opacity motion-safe:duration-300",
          showing && "opacity-100",
        )}
        aria-hidden
      />
    </>
  );
}
