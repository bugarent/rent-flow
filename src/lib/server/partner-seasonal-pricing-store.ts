import { dataRoot } from "@/lib/persistent-paths";
import { readFile, writeFile, mkdir } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  emptySeasonalPricing,
  parseSeasonalPricing,
  type PartnerSeasonalPricing,
} from "@/lib/partners/seasonal-pricing";

const STORE = join(dataRoot(), "partner-seasonal-pricing.json");

type StoreFile = Record<string, PartnerSeasonalPricing>;

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoreFile;
  } catch {
    return {};
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

export async function readPartnerSeasonalPricingFile(
  partnerId: string,
): Promise<PartnerSeasonalPricing> {
  const store = await readStore();
  return parseSeasonalPricing(store[partnerId]);
}

export async function writePartnerSeasonalPricingFile(
  partnerId: string,
  pricing: PartnerSeasonalPricing,
): Promise<PartnerSeasonalPricing> {
  const next = parseSeasonalPricing(pricing);
  const store = await readStore();
  store[partnerId] = next;
  await writeStore(store);
  return next;
}

export async function resolvePartnerSeasonalPricing(partner: {
  id: string;
  seasonalPricing?: unknown;
}): Promise<PartnerSeasonalPricing> {
  const fromDb = parseSeasonalPricing(
    partner && "seasonalPricing" in partner ? partner.seasonalPricing : undefined,
  );
  if (fromDb.enabled || fromDb.seasons.length) return fromDb;
  try {
    const fromFile = await readPartnerSeasonalPricingFile(partner.id);
    return fromFile.enabled || fromFile.seasons.length ? fromFile : emptySeasonalPricing();
  } catch {
    return emptySeasonalPricing();
  }
}
