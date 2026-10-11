/** Widths the Next image optimizer accepts (default `imageSizes` + `deviceSizes`). */
const OPTIMIZER_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

function optimizerWidth(width: number) {
  return OPTIMIZER_WIDTHS.find((w) => w >= width) ?? OPTIMIZER_WIDTHS[OPTIMIZER_WIDTHS.length - 1];
}

/** Shrink card images so below-the-fold cards do not download full-size files. */
export function displayImageUrl(url: string, width = 480): string {
  if (!url) return url;
  if (url.startsWith("/") && !url.startsWith("//")) {
    // Local uploads and photos: resize + WebP/AVIF via the Next image optimizer (quality must stay 75).
    if (url.startsWith("/_next/") || /\.svg($|\?)/i.test(url) || url.includes("?")) return url;
    return `/_next/image?url=${encodeURIComponent(url)}&w=${optimizerWidth(width)}&q=75`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "images.unsplash.com") return url;
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", "55");
    return parsed.toString();
  } catch {
    return url;
  }
}
