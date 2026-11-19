"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import Image, { type ImageLoader, type ImageProps } from "next/image";
import { canResizeImage, displayImageUrl } from "@/lib/media/display-image";

/** Card photos stay at this width. A 3840px src makes Neon resize time out and the photo vanishes. */
const CARD_WIDTH = 828;
const MAX_IMAGE_WIDTH = 1200;

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
 * One small photo for a homepage card.
 * next/image with onError reloads the largest src after hydration, so a card
 * that already loaded then requests a huge file and often comes back blank.
 */
export function CardImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const raw = typeof src === "string" ? src.trim() : "";
  const url = raw && !failed ? displayImageUrl(raw, CARD_WIDTH, { forSrcset: true }) : "";
  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
        <Car className="h-10 w-10" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
