/** Catalog id/slug for partner border-crossing permission extra. */
export const CROSS_BORDER_EXTRA_ID = "file-cross-border";
export const CROSS_BORDER_EXTRA_SLUG = "cross-border";

export function isCrossBorderExtra(input: { id?: string; slug?: string } | null | undefined) {
  if (!input) return false;
  const id = String(input.id || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  return id === CROSS_BORDER_EXTRA_ID || slug === CROSS_BORDER_EXTRA_SLUG;
}
