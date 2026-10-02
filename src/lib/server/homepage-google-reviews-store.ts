import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import type {
  GoogleReviewItem,
  HomepageGoogleReviewsConfig,
  PublicHomepageGoogleReviews,
} from "@/lib/catalog/homepage-google-reviews";
import {
  fetchGooglePlaceReviews,
} from "@/lib/google/places-reviews";
import {
  GOOGLE_REVIEW_MIN_RATING,
  parseAllowedRatings,
  reviewMatchesAllowedRatings,
  type GoogleReviewRatingOption,
} from "@/lib/catalog/homepage-google-reviews";
import { createTtlCache } from "@/lib/server/ttl-cache";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

export type { HomepageGoogleReviewsConfig, GoogleReviewItem, PublicHomepageGoogleReviews };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "homepage-google-reviews.json");
const cache = createTtlCache<HomepageGoogleReviewsConfig>(20_000);

function emptyConfig(): HomepageGoogleReviewsConfig {
  return {
    enabled: true,
    mapsUrl: "",
    placeId: null,
    placeName: null,
    placeRating: null,
    userRatingsTotal: null,
    placeUrl: null,
    allowedRatings: [...parseAllowedRatings(null)],
    reviews: [],
    lastFetchedAt: null,
    lastWarning: null,
    updatedAt: new Date().toISOString(),
  };
}

function parseReviews(raw: unknown): GoogleReviewItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r, i) => {
      const item = r as Partial<GoogleReviewItem>;
      return {
        id: String(item.id || `rev-${i}`),
        authorName: String(item.authorName || "Google user"),
        rating: Number(item.rating ?? 0),
        text: String(item.text || ""),
        photoUrl: item.photoUrl ? String(item.photoUrl) : null,
        relativeTime: String(item.relativeTime || ""),
      };
    })
    .filter((r) => r.rating >= GOOGLE_REVIEW_MIN_RATING && r.text);
}

function normalizeConfig(parsed: Partial<HomepageGoogleReviewsConfig>): HomepageGoogleReviewsConfig {
  return {
    enabled: parsed.enabled !== false,
    mapsUrl: String(parsed.mapsUrl || ""),
    placeId: parsed.placeId ? String(parsed.placeId) : null,
    placeName: parsed.placeName ? String(parsed.placeName) : null,
    placeRating: typeof parsed.placeRating === "number" ? parsed.placeRating : null,
    userRatingsTotal: typeof parsed.userRatingsTotal === "number" ? parsed.userRatingsTotal : null,
    placeUrl: parsed.placeUrl ? String(parsed.placeUrl) : null,
    allowedRatings: parseAllowedRatings(parsed.allowedRatings),
    reviews: parseReviews(parsed.reviews),
    lastFetchedAt: parsed.lastFetchedAt ? String(parsed.lastFetchedAt) : null,
    lastWarning: parsed.lastWarning ? String(parsed.lastWarning) : null,
    updatedAt: String(parsed.updatedAt || new Date().toISOString()),
  };
}

function visibleReviews(
  reviews: GoogleReviewItem[],
  allowedRatings: GoogleReviewRatingOption[] | number[],
): GoogleReviewItem[] {
  const allowed = parseAllowedRatings(allowedRatings);
  return reviews.filter((r) => reviewMatchesAllowedRatings(r.rating, allowed) && r.text.trim());
}

async function writeConfig(config: HomepageGoogleReviewsConfig) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
  cache.set(config);
  revalidatePublishedContent();
}

export async function getHomepageGoogleReviewsConfig(): Promise<HomepageGoogleReviewsConfig> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const next = normalizeConfig(JSON.parse(raw) as Partial<HomepageGoogleReviewsConfig>);
    cache.set(next);
    return next;
  } catch {
    return cache.peek() ?? emptyConfig();
  }
}

export async function setHomepageGoogleReviewsEnabled(enabled: boolean): Promise<HomepageGoogleReviewsConfig> {
  const current = await getHomepageGoogleReviewsConfig();
  const next: HomepageGoogleReviewsConfig = {
    ...current,
    enabled,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

export async function setHomepageGoogleReviewsAllowedRatings(
  allowedRatings: number[],
): Promise<HomepageGoogleReviewsConfig> {
  const current = await getHomepageGoogleReviewsConfig();
  const next: HomepageGoogleReviewsConfig = {
    ...current,
    allowedRatings: parseAllowedRatings(allowedRatings),
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

export async function saveHomepageGoogleMapsUrl(mapsUrl: string): Promise<HomepageGoogleReviewsConfig> {
  const current = await getHomepageGoogleReviewsConfig();
  const trimmed = mapsUrl.trim();
  const urlChanged = trimmed !== current.mapsUrl;
  const next: HomepageGoogleReviewsConfig = {
    ...current,
    mapsUrl: trimmed,
    ...(urlChanged
      ? {
          placeId: null,
          placeName: null,
          placeRating: null,
          userRatingsTotal: null,
          placeUrl: null,
          reviews: [],
          lastFetchedAt: null,
          lastWarning: null,
        }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

/** Save URL and replace reviews with comments from that Google Maps place. Old reviews are always discarded. */
export async function saveAndRefreshHomepageGoogleReviews(
  mapsUrl: string,
): Promise<HomepageGoogleReviewsConfig> {
  const current = await getHomepageGoogleReviewsConfig();
  const trimmed = mapsUrl.trim();
  if (!trimmed) {
    const cleared: HomepageGoogleReviewsConfig = {
      ...emptyConfig(),
      enabled: current.enabled,
      allowedRatings: current.allowedRatings,
    };
    await writeConfig(cleared);
    return cleared;
  }

  const fetched = await fetchGooglePlaceReviews(trimmed);
  const next: HomepageGoogleReviewsConfig = {
    enabled: current.enabled,
    allowedRatings: current.allowedRatings,
    mapsUrl: trimmed,
    placeId: fetched.placeId,
    placeName: fetched.placeName,
    placeRating: fetched.placeRating,
    userRatingsTotal: fetched.userRatingsTotal,
    placeUrl: fetched.placeUrl,
    reviews: fetched.reviews,
    lastFetchedAt: new Date().toISOString(),
    lastWarning: fetched.warning ?? null,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

export async function getPublicHomepageGoogleReviews(): Promise<PublicHomepageGoogleReviews | null> {
  const config = await getHomepageGoogleReviewsConfig();
  if (!config.enabled) return null;
  const reviews = visibleReviews(config.reviews, config.allowedRatings);
  const mapsUrl = (config.placeUrl || config.mapsUrl || "").trim();
  if (!reviews.length && !mapsUrl) return null;
  return {
    mapsUrl,
    placeName: config.placeName,
    placeRating: config.placeRating,
    placeUrl: config.placeUrl,
    reviews,
  };
}
