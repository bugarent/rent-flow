import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/server/data-paths";

export type ApiAvailabilityBlock = {
  start: string;
  end: string;
  reference?: string;
};

type CarRow = {
  carId: string;
  partnerId: string;
  blocks: ApiAvailabilityBlock[];
  updatedAt: string;
};

type StoreFile = { cars: CarRow[] };

async function storePath() {
  return resolveDataFile("partner", "partner-api-availability.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { cars: Array.isArray(parsed.cars) ? parsed.cars : [] };
  } catch {
    return { cars: [] };
  }
}

async function writeStore(data: StoreFile) {
  const path = await storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

export async function listAllApiAvailability(): Promise<Array<{ carId: string; start: string; end: string }>> {
  const { cars } = await readStore();
  return cars.flatMap((row) => row.blocks.map((b) => ({ carId: row.carId, start: b.start, end: b.end })));
}

export async function getCarApiAvailability(carId: string) {
  const { cars } = await readStore();
  return cars.find((row) => row.carId === carId) || null;
}

/** Replaces the car's full list of busy ranges (the API is idempotent per push). */
export async function replaceCarApiAvailability(carId: string, partnerId: string, blocks: ApiAvailabilityBlock[]) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.cars.find((row) => row.carId === carId);
  if (existing) {
    existing.blocks = blocks;
    existing.partnerId = partnerId;
    existing.updatedAt = now;
  } else {
    store.cars.push({ carId, partnerId, blocks, updatedAt: now });
  }
  await writeStore(store);
  return { carId, blocks, updatedAt: now };
}
