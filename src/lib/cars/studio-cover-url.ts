/** Saved catalog covers use this filename so gallery uploads are never treated as the cover. */
export function isStudioCoverUrl(url: string): boolean {
  return /\/studio-[a-f0-9]{20}\.jpe?g(?:\?|#|$)/i.test(String(url || "").trim());
}
