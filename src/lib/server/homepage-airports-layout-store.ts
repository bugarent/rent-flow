import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  normalizePopularAirportsLayout,
  type PopularAirportsLayout,
} from "@/lib/catalog/popular-airports-layout";
import { prisma } from "@/lib/prisma";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

export type { PopularAirportsLayout };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "homepage-airports-layout.json");
const DEFAULT_LAYOUT: PopularAirportsLayout = "grid";

async function readFileStore(): Promise<PopularAirportsLayout | null> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as { layout?: unknown };
    if (!parsed || typeof parsed !== "object" || parsed.layout == null) return null;
    return normalizePopularAirportsLayout(parsed.layout);
  } catch {
    return null;
  }
}

async function writeFileStore(layout: PopularAirportsLayout) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify({ layout }, null, 2), "utf8");
  revalidatePublishedContent();
}

export async function getPopularAirportsLayout(): Promise<PopularAirportsLayout> {
  const published = await readFileStore();
  if (published) return published;

  const { isDbCircuitOpen, markDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return DEFAULT_LAYOUT;

  try {
    const settings = await prisma.platformSetting.findUnique({ where: { id: "default" } });
    if (settings) {
      return normalizePopularAirportsLayout(settings.popularAirportsLayout);
    }
  } catch (error) {
    const { isDbOfflineError } = await import("@/lib/server/db-errors");
    if (isDbOfflineError(error)) {
      markDbCircuitOpen("homepage-airports-layout", error);
    } else {
      console.warn("[homepage-airports-layout] DB read failed, using file store:", error);
    }
  }
  return (await readFileStore()) ?? DEFAULT_LAYOUT;
}

export async function setPopularAirportsLayout(
  layout: PopularAirportsLayout,
): Promise<PopularAirportsLayout> {
  const next = normalizePopularAirportsLayout(layout);

  try {
    await prisma.platformSetting.upsert({
      where: { id: "default" },
      create: { id: "default", popularAirportsLayout: next },
      update: { popularAirportsLayout: next },
    });
    await writeFileStore(next);
    return next;
  } catch (error) {
    console.warn("[homepage-airports-layout] DB write failed, using file store:", error);
    await writeFileStore(next);
    return next;
  }
}
