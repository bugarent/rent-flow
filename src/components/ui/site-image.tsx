"use client";

import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import Image, { type ImageLoader, type ImageProps } from "next/image";
import { canResizeImage, displayImageUrl } from "@/lib/media/display-image";

/** Card photos stay at this width. A 3840px src makes Neon resize time out and the photo vanishes. */
const CARD_WIDTH = 640;
const MAX_IMAGE_WIDTH = 1200;
/** HostedFile cold hits can hang; show the car icon instead of a white hole. */
const CARD_LOAD_TIMEOUT_MS = 7000;

/**
 * Every srcset entry goes through displayImageUrl, which already resizes into
 * WebP/AVIF at the source (Cloudinary f_auto, our /uploads WebP resizer,
 * Unsplash auto=format, local files via /_next/image) — no second re-encode.
 */
const siteLoader: ImageLoader = ({ src, width }) =>
  displayImageUrl(src, Math.min(width, MAX_IMAGE_WIDTH), { forSrcset: true });

/**
 * next/image with the site loader: responsive srcset from `sizes`, lazy by default.
 * Above-the-fold images pass loading="eager" and fetchPriority="high".
 */
export function SiteImage({
  src,
  alt,
  unoptimized,
  decoding = "async",
  ...props
}: Omit<ImageProps, "loader">) {
  const url = typeof src === "string" ? src : "";
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      decoding={decoding}
      loader={siteLoader}
      unoptimized={unoptimized ?? (url ? !canResizeImage(url) : false)}
    />
  );
}

/**
 * One small photo for a card / search result.
 * next/image with onError reloads the largest src after hydration, so a card
 * that already loaded then requests a huge file and often comes back blank.
 */
export function CardImage({
  src,
  alt,
  loading = "lazy",
  fetchPriority,
}: {
  src?: string | null;
  alt: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const raw = typeof src === "string" ? src.trim() : "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const failed = Boolean(raw) && failedSrc === raw;
  const url = raw && !failed ? displayImageUrl(raw, CARD_WIDTH, { forSrcset: true }) : "";
  const ready = Boolean(url) && readySrc === url;

  useEffect(() => {
    if (!url || readySrc === url) return;
    const timer = window.setTimeout(() => setFailedSrc(raw), CARD_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [url, raw, readySrc]);

  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
        <Car className="h-10 w-10" aria-hidden />
      </div>
    );
  }
  return (
    <>
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
          <Car className="h-10 w-10 animate-pulse" aria-hidden />
        </div>
      ) : null}
      <img
        src={url}
        alt={alt}
        className={
          ready
            ? "absolute inset-0 h-full w-full object-cover object-center"
            : "pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-0"
        }
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onLoad={() => setReadySrc(url)}
        onError={() => setFailedSrc(raw)}
      />
    </>
  );
}
