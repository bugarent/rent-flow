import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";
import { softTimeout } from "@/lib/server/soft-timeout";
import {
  SEO_LANDING_LOCALES,
  SEO_LANDING_PREFIX,
  listSeoLocations,
  seoLandingPath,
} from "@/lib/seo/location-landings";

type CarSitemapRow = { id: string; updatedAt?: Date | string | null };

async function loadApprovedCarIds(): Promise<CarSitemapRow[]> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.car.findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      take: 2000,
      orderBy: { updatedAt: "desc" },
    });
    return Array.isArray(rows) ? (rows as CarSitemapRow[]) : [];
  } catch {
    return [];
  }
}

async function loadAirportCards(): Promise<Array<{ iata: string; updatedAt?: string }> > {
  try {
    const { listHomepageAirports } = await import("@/lib/server/homepage-airports-store");
    return (await listHomepageAirports()).filter((row) => row.iata.trim());
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/cars", changeFrequency: "hourly", priority: 0.95 },
    { path: "/locations", changeFrequency: "weekly", priority: 0.85 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/help", changeFrequency: "weekly", priority: 0.75 },
    { path: "/partnership", changeFrequency: "monthly", priority: 0.65 },
    { path: "/become-partner", changeFrequency: "monthly", priority: 0.65 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/register", changeFrequency: "monthly", priority: 0.4 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const cars = await softTimeout(loadApprovedCarIds(), [], 2500);
  const carEntries: MetadataRoute.Sitemap = cars.map((car) => ({
    url: `${SITE_URL}/cars/${encodeURIComponent(car.id)}`,
    lastModified: car.updatedAt ? new Date(car.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const airports = await softTimeout(loadAirportCards(), [], 2500);
  const airportEntries: MetadataRoute.Sitemap = airports.map((row) => ({
    url: `${SITE_URL}/airport/${encodeURIComponent(row.iata.toUpperCase())}`,
    lastModified: row.updatedAt ? new Date(row.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const seoLocations = await softTimeout(listSeoLocations(), [], 4000);
  const locationEntries: MetadataRoute.Sitemap = [];
  for (const locale of SEO_LANDING_LOCALES) {
    for (const loc of seoLocations) {
      locationEntries.push({
        url: `${SITE_URL}${seoLandingPath(locale, loc.slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: loc.kind === "airport" ? 0.92 : 0.88,
      });
    }
  }

  // Ensure prefix roots are discoverable even if empty (helps Search Console).
  for (const locale of SEO_LANDING_LOCALES) {
    void SEO_LANDING_PREFIX[locale];
  }

  return [...staticEntries, ...locationEntries, ...airportEntries, ...carEntries];
}
