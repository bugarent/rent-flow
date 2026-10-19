"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";
import { canResizeImage, displayImageUrl } from "@/lib/media/display-image";

/**
 * Every srcset entry goes through displayImageUrl, which already resizes into
 * WebP/AVIF at the source (Cloudinary f_auto, our /uploads WebP resizer,
 * Unsplash auto=format, local files via /_next/image) — no second re-encode.
 */
const siteLoader: ImageLoader = ({ src, width }) => displayImageUrl(src, width, { forSrcset: true });

/**
 * next/image with the site loader: responsive srcset from `sizes`, lazy by default.
 * Above-the-fold images pass loading="eager" and fetchPriority="high".
 */
export function SiteImage({ src, alt, unoptimized, ...props }: Omit<ImageProps, "loader">) {
  const url = typeof src === "string" ? src : "";
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      loader={siteLoader}
      unoptimized={unoptimized ?? (url ? !canResizeImage(url) : false)}
    />
  );
}
