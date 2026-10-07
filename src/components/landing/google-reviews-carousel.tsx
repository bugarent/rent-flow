"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { GoogleReviewItem, PublicHomepageGoogleReviews } from "@/lib/catalog/homepage-google-reviews";
import { usePreferences } from "@/components/providers/preferences-context";

const AVATAR_COLORS = ["#9a3412", "#1e293b", "#0f766e", "#6b21a8", "#991b1b", "#1d4ed8"];

// Brand colours fail text-contrast checks, so the wordmark is an image with alt text.
const GOOGLE_WORDMARK_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 28"><text x="0" y="22" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="500" letter-spacing="-0.5"><tspan fill="#4285F4">G</tspan><tspan fill="#EA4335">o</tspan><tspan fill="#FBBC05">o</tspan><tspan fill="#4285F4">g</tspan><tspan fill="#34A853">l</tspan><tspan fill="#EA4335">e</tspan></text></svg>',
)}`;

function GoogleWordmark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={GOOGLE_WORDMARK_SRC}
      alt="Google"
      width={72}
      height={28}
      className="inline-block h-[26px] w-auto sm:h-[28px]"
    />
  );
}

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.5l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

function Stars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  const cls = size === "sm" ? "text-[15px] leading-none tracking-[1px]" : "text-[18px] leading-none tracking-[1px]";
  return (
    <p className={cls} aria-label={`${rating} star rating`}>
      <span className="text-[#a16207]" aria-hidden>
        {"★".repeat(full)}
      </span>
      <span className="text-slate-500" aria-hidden>
        {"★".repeat(5 - full)}
      </span>
    </p>
  );
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ReviewCard({
  item,
  readMoreLabel,
  readLessLabel,
}: {
  item: GoogleReviewItem;
  readMoreLabel: string;
  readLessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const initial = item.authorName.trim().slice(0, 1).toUpperCase() || "G";

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [item.text, expanded]);

  return (
    <article className="flex h-full min-h-[220px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: avatarColor(item.authorName) }}
            >
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">{item.authorName}</p>
            {item.relativeTime ? <p className="text-xs text-slate-500">{item.relativeTime}</p> : null}
          </div>
        </div>
        <GoogleMark className="h-5 w-5 shrink-0" />
      </div>

      <div className="mb-2 flex items-center gap-1">
        <Stars rating={item.rating} size="sm" />
        <BadgeCheck className="h-4 w-4 text-[#1a73e8]" aria-hidden />
      </div>

      <p
        ref={textRef}
        className={`text-sm leading-relaxed text-slate-700 ${expanded ? "" : "line-clamp-4"}`}
      >
        {item.text}
      </p>
      {clamped ? (
        <button
          type="button"
          className="mt-auto pt-3 text-left text-sm font-medium text-slate-500 hover:text-slate-700"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? readLessLabel : readMoreLabel}
        </button>
      ) : (
        <span className="mt-auto" />
      )}
    </article>
  );
}

export function GoogleReviewsCarousel({
  reviews,
  placeRating,
  mapsUrl,
}: PublicHomepageGoogleReviews) {
  const { dictionary } = usePreferences();
  const items = useMemo(() => reviews.filter((r) => r.rating >= 4.8 && r.text.trim()), [reviews]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const rating =
    placeRating && placeRating > 0
      ? placeRating
      : items.length
        ? items.reduce((sum, r) => sum + r.rating, 0) / items.length
        : 5;
  const ratingLabel = rating.toFixed(1).replace(/\.0$/, ".0");
  const topRated = dictionary.home.googleReviewsTopRated;

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [items.length, paused]);

  if (!items.length) {
    const href = mapsUrl.trim();
    if (!href) return null;
    return (
      <section
        id="testimonials"
        className="relative w-full min-w-0 overflow-x-clip px-4 pb-4 pt-1 sm:px-6 sm:pb-5"
      >
        <div className="relative mx-auto max-w-6xl rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-5">
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
            <GoogleWordmark />
          </a>
        </div>
      </section>
    );
  }

  const visibleCount = Math.min(3, items.length);
  const visible = Array.from({ length: visibleCount }, (_, offset) => items[(index + offset) % items.length]);

  const step = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + items.length) % items.length);
  };

  const header = (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <GoogleWordmark />
        <Stars rating={rating} />
        <p className="text-sm font-semibold text-slate-800">
          {ratingLabel}
          <span className="mx-1.5 font-normal text-slate-500" aria-hidden>|</span>
          <span className="font-semibold text-slate-800">{topRated}</span>
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
        {dictionary.home.googleReviewsVerified}
        <Info className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      </span>
    </div>
  );

  const cards = visible.map((item, slot) => (
    <ReviewCard
      key={`${item.id}-${index}-${slot}`}
      item={item}
      readMoreLabel={dictionary.home.googleReviewsReadMore}
      readLessLabel={dictionary.home.googleReviewsReadLess}
    />
  ));

  return (
    <section
      id="testimonials"
      className="relative w-full min-w-0 overflow-x-clip px-4 pb-4 pt-1 sm:px-6 sm:pb-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto max-w-6xl rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-5">
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            {header}
          </a>
        ) : (
          header
        )}

        <div className="relative">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">{cards}</div>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                aria-label={dictionary.home.googleReviewsPrev}
                onClick={() => step(-1)}
                className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:-translate-x-1/2"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={dictionary.home.googleReviewsNext}
                onClick={() => step(1)}
                className="absolute right-0 top-1/2 z-10 flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
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
