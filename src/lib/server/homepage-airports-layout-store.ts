import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  normalizePopularAirportsLayout,
  type PopularAirportsLayout,
} from "@/lib/catalog/popular-airports-layout";
import { prisma } from "@/lib/prisma";

export type { PopularAirportsLayout };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "homepage-airports-layout.json");
const DEFAULT_LAYOUT: PopularAirportsLayout = "grid";

async function readFileStore(): Promise<PopularAirportsLayout> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as { layout?: unknown };
    return normalizePopularAirportsLayout(parsed.layout);
  } catch {
    await writeFileStore(DEFAULT_LAYOUT);
    return DEFAULT_LAYOUT;
  }
}

async function writeFileStore(layout: PopularAirportsLayout) {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify({ layout }, null, 2), "utf8");
  } catch {
    /* Hosted filesystem is read-only. */
  }
}

export async function getPopularAirportsLayout(): Promise<PopularAirportsLayout> {
  const { isDbCircuitOpen, markDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return readFileStore();

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
  return readFileStore();
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
