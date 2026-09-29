import "server-only";

import type { GoogleReviewItem } from "@/lib/catalog/homepage-google-reviews";
import { GOOGLE_REVIEW_MIN_RATING } from "@/lib/catalog/homepage-google-reviews";

export function hasGooglePlacesApiKey(): boolean {
  return Boolean(apiKey());
}

/** Extract a Google Place ID from common Maps URL formats, or accept raw ChIJ… / places/… ids. */
export function extractGooglePlaceId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^ChIJ[\w-]+$/.test(raw)) return raw;
  if (/^places\//i.test(raw)) return raw.replace(/^places\//i, "");

  try {
    const url = new URL(raw);
    const placeIdParam = url.searchParams.get("place_id") || url.searchParams.get("query_place_id");
    if (placeIdParam) return placeIdParam;

    const q = url.searchParams.get("q") || "";
    const qMatch = q.match(/place_id[:\s]*([A-Za-z0-9_-]+)/i);
    if (qMatch?.[1]) return qMatch[1];

    const pathMatch = url.pathname.match(/place\/[^/]+\/data=.*?1s(0x[\da-f]+:0x[\da-f]+)/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const chij = raw.match(/(ChIJ[\w-]{10,})/);
    if (chij?.[1]) return chij[1];
  } catch {
    const chij = raw.match(/(ChIJ[\w-]{10,})/);
    if (chij?.[1]) return chij[1];
  }

  return null;
}

function apiKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

function isShortMapsHost(hostname: string) {
  return /(^|\.)(share\.google|maps\.app\.goo\.gl|goo\.gl)$/i.test(hostname);
}

/** Follow share.google / maps.app.goo.gl redirects and pull a Place ID from the final URL or HTML. */
async function expandMapsInput(input: string): Promise<string> {
  const trimmed = input.trim();
  if (extractGooglePlaceId(trimmed)) return trimmed;

  let current = trimmed;
  try {
    new URL(current);
  } catch {
    return trimmed;
  }

  for (let i = 0; i < 6; i += 1) {
    if (extractGooglePlaceId(current)) return current;
    let hostname = "";
    try {
      hostname = new URL(current).hostname;
    } catch {
      return current;
    }

    const res = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const location = res.headers.get("location");
    if (location) {
      current = new URL(location, current).href;
      continue;
    }

    if (res.ok) {
      const html = (await res.text()).slice(0, 400_000);
      const fromHtml = extractGooglePlaceId(html);
      if (fromHtml) return fromHtml;
      const mapsLink = html.match(/https:\/\/www\.google\.com\/maps\/place\/[^"'\\\s<>]+/i)?.[0];
      if (mapsLink) {
        const decoded = mapsLink.replace(/&amp;/g, "&");
        if (extractGooglePlaceId(decoded)) return decoded;
        current = decoded;
        continue;
      }
    }

    if (!isShortMapsHost(hostname)) break;
  }

  return current;
}

/** Fetch reviews from Google Place Details and keep ratings that can pass the 4.8 / 4.9 / 5.0 filter. */
export async function fetchGooglePlaceReviews(mapsUrlOrPlaceId: string): Promise<{
  placeId: string | null;
  placeName: string | null;
  placeRating: number | null;
  userRatingsTotal: number | null;
  placeUrl: string | null;
  reviews: GoogleReviewItem[];
  warning?: string;
}> {
  const key = apiKey();
  if (!key) {
    return {
      placeId: null,
      placeName: null,
      placeRating: null,
      userRatingsTotal: null,
      placeUrl: null,
      reviews: [],
      warning: "Set GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY) in the environment to load Google reviews.",
    };
  }

  const expanded = await expandMapsInput(mapsUrlOrPlaceId);
  let placeId = extractGooglePlaceId(expanded);

  // If URL has no place id, try Find Place from the human-readable place name in the path
  if (!placeId) {
    try {
      const url = new URL(expanded);
      const nameFromPath = decodeURIComponent(url.pathname.split("/place/")[1]?.split("/")[0] || "")
        .replace(/\+/g, " ")
        .trim();
      if (nameFromPath) {
        const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
        findUrl.searchParams.set("input", nameFromPath);
        findUrl.searchParams.set("inputtype", "textquery");
        findUrl.searchParams.set("fields", "place_id,name");
        findUrl.searchParams.set("key", key);
        const findRes = await fetch(findUrl.toString(), { next: { revalidate: 0 } });
        const findData = (await findRes.json()) as {
          candidates?: Array<{ place_id?: string; name?: string }>;
          status?: string;
        };
        placeId = findData.candidates?.[0]?.place_id || null;
      }
    } catch {
      /* ignore */
    }
  }

  if (!placeId) {
    return {
      placeId: null,
      placeName: null,
      placeRating: null,
      userRatingsTotal: null,
      placeUrl: null,
      reviews: [],
      warning:
        "Could not resolve a Google Place ID from this link. Open the place in Google Maps → Share → copy the full link, or paste a Place ID (ChIJ…).",
    };
  }

  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", placeId);
  detailsUrl.searchParams.set("fields", "name,rating,user_ratings_total,reviews,url");
  detailsUrl.searchParams.set("reviews_sort", "newest");
  detailsUrl.searchParams.set("key", key);

  const res = await fetch(detailsUrl.toString(), { next: { revalidate: 0 } });
  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    result?: {
      name?: string;
      rating?: number;
      user_ratings_total?: number;
      url?: string;
      reviews?: Array<{
        author_name?: string;
        rating?: number;
        text?: string;
        profile_photo_url?: string;
        relative_time_description?: string;
        time?: number;
      }>;
    };
  };

  if (data.status && data.status !== "OK") {
    return {
      placeId,
      placeName: null,
      placeRating: null,
      userRatingsTotal: null,
      placeUrl: null,
      reviews: [],
      warning: data.error_message || `Google Places status: ${data.status}`,
    };
  }

  const reviews = (data.result?.reviews ?? [])
    .map((r, index) => ({
      id: `${placeId}-${r.time ?? index}`,
      authorName: String(r.author_name || "Google user"),
      rating: Number(r.rating ?? 0),
      text: String(r.text || "").trim(),
      photoUrl: r.profile_photo_url ? String(r.profile_photo_url) : null,
      relativeTime: String(r.relative_time_description || ""),
    }))
    .filter((r) => r.rating >= GOOGLE_REVIEW_MIN_RATING && r.text.length > 0);

  return {
    placeId,
    placeName: data.result?.name ?? null,
    placeRating: typeof data.result?.rating === "number" ? data.result.rating : null,
    userRatingsTotal: typeof data.result?.user_ratings_total === "number" ? data.result.user_ratings_total : null,
    placeUrl: data.result?.url ? String(data.result.url) : null,
    reviews,
  };
}
