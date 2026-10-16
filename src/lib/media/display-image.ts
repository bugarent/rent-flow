/** Widths the Next image optimizer / our upload resizer accept. */
const OPTIMIZER_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

function optimizerWidth(width: number) {
  const want = Math.max(16, Math.floor(width));
  return OPTIMIZER_WIDTHS.find((w) => w >= want) ?? OPTIMIZER_WIDTHS[OPTIMIZER_WIDTHS.length - 1];
}

function looksLikeCloudinaryTransform(segment: string): boolean {
  if (!segment || segment.includes(".")) return false;
  if (/^v\d+$/.test(segment)) return false;
  // e.g. f_auto,q_auto,w_640 or c_fill,g_auto
  return /(?:^|,)[a-z]+_/i.test(segment) || segment.includes(",");
}

/**
 * Insert (or replace) Cloudinary delivery transforms so the CDN serves a
 * resized modern format instead of the full original.
 */
export function optimizeCloudinaryUrl(url: string, width = 640): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return url;
    const marker = "/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return url;

    const prefix = parsed.pathname.slice(0, idx + marker.length);
    let rest = parsed.pathname.slice(idx + marker.length);

    // Drop a leading transform segment so we do not stack duplicates.
    const slash = rest.indexOf("/");
    if (slash > 0) {
      const first = rest.slice(0, slash);
      if (looksLikeCloudinaryTransform(first)) {
        rest = rest.slice(slash + 1);
      }
    }

    const w = optimizerWidth(width);
    parsed.pathname = `${prefix}f_auto,q_auto,dpr_auto,w_${w},c_limit/${rest}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Shrink card images so below-the-fold cards do not download full-size files. */
export function displayImageUrl(url: string, width = 480): string {
  if (!url) return url;
  if (url.startsWith("/") && !url.startsWith("//")) {
    if (url.startsWith("/_next/") || /\.svg($|\?)/i.test(url)) return url;
    // Hosted uploads (Neon HostedFile): use our /uploads?w= resize — Next's
    // optimizer returns 400 for these paths and full originals are multi‑MB.
    if (url.startsWith("/uploads/")) {
      const pathOnly = url.split(/[?#]/)[0];
      return `${pathOnly}?w=${optimizerWidth(width)}`;
    }
    if (url.includes("?")) return url;
    return `/_next/image?url=${encodeURIComponent(url)}&w=${optimizerWidth(width)}&q=75`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "res.cloudinary.com") {
      return optimizeCloudinaryUrl(url, width);
    }
    if (parsed.hostname !== "images.unsplash.com") return url;
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", String(optimizerWidth(width)));
    parsed.searchParams.set("q", "55");
    return parsed.toString();
  } catch {
    return url;
  }
}
