export type GoogleReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  photoUrl: string | null;
  relativeTime: string;
};

export const GOOGLE_REVIEW_RATING_OPTIONS = [4.8, 4.9, 5] as const;
export type GoogleReviewRatingOption = (typeof GOOGLE_REVIEW_RATING_OPTIONS)[number];
export const GOOGLE_REVIEW_MIN_RATING: GoogleReviewRatingOption = 4.8;

export function parseAllowedRatings(raw: unknown): GoogleReviewRatingOption[] {
  const nums = Array.isArray(raw) ? raw.map(Number) : [];
  const selected = GOOGLE_REVIEW_RATING_OPTIONS.filter((opt) =>
    nums.some((n) => Math.abs(n - opt) < 0.051),
  );
  return selected.length ? selected : [...GOOGLE_REVIEW_RATING_OPTIONS];
}

/** A review is shown when its rating meets the lowest selected threshold (4.8 / 4.9 / 5.0). */
export function reviewMatchesAllowedRatings(
  rating: number,
  allowed: GoogleReviewRatingOption[],
): boolean {
  if (!allowed.length) return false;
  const floor = Math.min(...allowed);
  return rating + 1e-9 >= floor;
}

export type HomepageGoogleReviewsConfig = {
  enabled: boolean;
  mapsUrl: string;
  placeId: string | null;
  placeName: string | null;
  placeRating: number | null;
  userRatingsTotal: number | null;
  placeUrl: string | null;
  /** Selected thresholds: 4.8, 4.9 and/or 5.0. Reviews at or above the lowest selected value are shown. */
  allowedRatings: number[];
  reviews: GoogleReviewItem[];
  lastFetchedAt: string | null;
  lastWarning: string | null;
  updatedAt: string;
};

export type PublicHomepageGoogleReviews = {
  mapsUrl: string;
  placeName: string | null;
  placeRating: number | null;
  placeUrl: string | null;
  reviews: GoogleReviewItem[];
};
