"use client";

import { useState } from "react";
import type { CountryCoverMap } from "@/lib/catalog/country-covers";
import { useHomeCountry } from "@/lib/catalog/home-country-store";
import { cn } from "@/lib/utils";

const PHONE_MEDIA = "(max-width: 639px)";
/** Recently shown covers stay mounted, so switching back is instant (already decoded). */
const KEEP_MOUNTED = 3;

/**
 * Landmark photo for the picked country, layered over the default hero photo.
 * Nothing loads until a country is picked, so the first paint (LCP) is untouched.
 */
export function HeroCountryCover({ covers }: { covers: CountryCoverMap }) {
  const country = useHomeCountry();
  const active = country && covers[country] ? country : "";
  const [mounted, setMounted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string[]>([]);

  if (active && !mounted.includes(active)) {
    setMounted([...mounted.filter((iso) => iso !== active), active].slice(-KEEP_MOUNTED));
  }

  const markLoaded = (iso: string) =>
    setLoaded((prev) => (prev.includes(iso) ? prev : [...prev, iso]));
  const showing = Boolean(active && loaded.includes(active));

  return (
    <>
      {mounted.map((iso) => {
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
              fetchPriority="low"
              onLoad={() => markLoaded(iso)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out",
                visible && "opacity-100",
              )}
              style={{ objectPosition: `${Math.round(cover.focalX * 100)}% 50%` }}
              aria-hidden
            />
          </picture>
        );
      })}
      {/* Darkens bright landmark photos so the glass card and white text keep their contrast. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/15 to-slate-950/60 opacity-0 motion-safe:transition-opacity motion-safe:duration-700",
          showing && "opacity-100",
        )}
        aria-hidden
      />
    </>
  );
}
