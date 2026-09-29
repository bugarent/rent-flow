import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";
import { softTimeout } from "@/lib/server/soft-timeout";

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

  return [...staticEntries, ...carEntries];
}
