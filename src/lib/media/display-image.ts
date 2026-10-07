/** Shrink known remote CDNs so below-the-fold cards do not download full-bleed files. */
export function displayImageUrl(url: string, width = 480): string {
  if (!url) return url;
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
