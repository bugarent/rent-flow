import { Suspense } from "react";
import type { Metadata } from "next";
import {
  HomeBelowFold,
  HomeBelowFoldPlaceholder,
  HomeHeroPlaceholder,
  HomeHeroSection,
} from "@/components/landing/home-sections";
import { cachedHomepageAirports } from "@/lib/server/public-page-data";
import { softTimeout } from "@/lib/server/soft-timeout";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";
import { buildHomeSeo } from "@/lib/seo/home-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, airports] = await Promise.all([
    readPreferences(),
    softTimeout(cachedHomepageAirports(), [], 800),
  ]);
  const seo = buildHomeSeo(locale, airports.map((a) => a.iata));
  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: "/",
    locale,
    keywords: [...(getPageSeo("home", locale).keywords ?? []), "RENT AIRPORT CARS", "rent airport cars"],
  });
}

/**
 * The hero (LCP photo + search form) is in the first bytes; data-driven sections stream in
 * after it. The hero fills the first screen, so the sections arriving below it shift nothing.
 */
export default function Home() {
  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-clip">
      <link
        rel="preload"
        as="image"
        href="/images/hero-tarmac-sm.webp"
        media="(max-width: 828px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/images/hero-tarmac.webp"
        media="(min-width: 829px)"
        fetchPriority="high"
      />
      <Suspense fallback={<HomeHeroPlaceholder />}>
        <HomeHeroSection />
      </Suspense>
      <Suspense fallback={<HomeBelowFoldPlaceholder />}>
        <HomeBelowFold />
      </Suspense>
    </div>
  );
}
