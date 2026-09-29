import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getHomepageGoogleReviewsConfig,
  saveAndRefreshHomepageGoogleReviews,
  saveHomepageGoogleMapsUrl,
  setHomepageGoogleReviewsAllowedRatings,
  setHomepageGoogleReviewsEnabled,
} from "@/lib/server/homepage-google-reviews-store";
import {
  GOOGLE_REVIEW_MIN_RATING,
  GOOGLE_REVIEW_RATING_OPTIONS,
} from "@/lib/catalog/homepage-google-reviews";
import { hasGooglePlacesApiKey } from "@/lib/google/places-reviews";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  mapsUrl: z.string().trim().max(2000).optional(),
  refresh: z.boolean().optional(),
  enabled: z.boolean().optional(),
  allowedRatings: z.array(z.number()).optional(),
});

function withMeta(config: Awaited<ReturnType<typeof getHomepageGoogleReviewsConfig>>) {
  return {
    ...config,
    minRating: GOOGLE_REVIEW_MIN_RATING,
    ratingOptions: GOOGLE_REVIEW_RATING_OPTIONS,
    placesApiConfigured: hasGooglePlacesApiKey(),
  };
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const config = await getHomepageGoogleReviewsConfig();
    return NextResponse.json(withMeta(config));
  } catch (error) {
    console.error("[homepage/google-reviews GET]", error);
    return NextResponse.json({ error: "Could not load Google reviews settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = schema.parse(await req.json());

    if (body.allowedRatings && body.mapsUrl === undefined && typeof body.enabled !== "boolean") {
      const config = await setHomepageGoogleReviewsAllowedRatings(body.allowedRatings);
      return NextResponse.json(withMeta(config));
    }

    if (typeof body.enabled === "boolean" && body.mapsUrl === undefined && !body.allowedRatings) {
      const config = await setHomepageGoogleReviewsEnabled(body.enabled);
      return NextResponse.json(withMeta(config));
    }

    if (body.mapsUrl === undefined) {
      return NextResponse.json({ error: "mapsUrl is required" }, { status: 400 });
    }

    let config =
      body.refresh === false
        ? await saveHomepageGoogleMapsUrl(body.mapsUrl)
        : await saveAndRefreshHomepageGoogleReviews(body.mapsUrl);
    if (typeof body.enabled === "boolean") {
      config = await setHomepageGoogleReviewsEnabled(body.enabled);
    }
    if (body.allowedRatings) {
      config = await setHomepageGoogleReviewsAllowedRatings(body.allowedRatings);
    }
    return NextResponse.json(withMeta(config));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid URL" }, { status: 400 });
    }
    console.error("[homepage/google-reviews PUT]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save Google reviews" },
      { status: 500 },
    );
  }
}
