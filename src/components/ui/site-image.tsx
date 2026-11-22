"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import Image, { type ImageLoader, type ImageProps } from "next/image";
import { canResizeImage, displayImageUrl } from "@/lib/media/display-image";

/** Card photos stay at this width. A 3840px src makes Neon resize time out and the photo vanishes. */
const CARD_WIDTH = 640;
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

function PhotoPlaceholder({ pulse = false }: { pulse?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
      <Car className={pulse ? "h-10 w-10 animate-pulse" : "h-10 w-10"} aria-hidden />
    </div>
  );
}

/**
 * One small photo for a card / search result.
 * A native img: next/image's onError reloads the largest src after hydration
 * and the photo comes back blank. The img stays mounted until it actually
 * errors, so a slow upload or a card that scrolls into view later still shows.
 * Images that finished before hydration are revealed from the ref — onLoad
 * does not fire again for those.
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
  const url = raw ? displayImageUrl(raw, CARD_WIDTH, { forSrcset: true }) : "";
  const [trackedUrl, setTrackedUrl] = useState(url);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  if (url !== trackedUrl) {
    setTrackedUrl(url);
    setPhase("loading");
  }

  if (!url || phase === "error") return <PhotoPlaceholder />;

  return (
    <>
      {phase === "ready" ? null : <PhotoPlaceholder pulse />}
      <img
        key={url}
        ref={(node) => {
          if (!node?.complete) return;
          setPhase(node.naturalWidth > 0 ? "ready" : "error");
        }}
        src={url}
        alt={alt}
        className={
          phase === "ready"
            ? "absolute inset-0 h-full w-full object-cover object-center"
            : "pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-0"
        }
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onLoad={() => setPhase("ready")}
        onError={() => setPhase("error")}
      />
    </>
  );
}
