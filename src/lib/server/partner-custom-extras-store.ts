import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  slugifyExtraName,
  toExtraServicePricing,
  type ExtraServicePricing,
} from "@/lib/extras/pricing";

const STORE = join(dataRoot(), "partner-custom-extras.json");

export type PartnerCustomExtra = {
  id: string;
  slug: string;
  name: string;
  description: string;
  defaultPriceEur: number;
  maxPriceEur: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type StoreFile = Record<string, PartnerCustomExtra[]>;

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

export function partnerCustomToPricing(row: PartnerCustomExtra): ExtraServicePricing {
  return toExtraServicePricing({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isTpl: false,
    isActive: row.isActive !== false,
    sortOrder: 900,
    defaultPriceEur: row.defaultPriceEur,
    minPriceEur: 0,
    maxPriceEur: row.maxPriceEur,
    checkoutSlot: "none",
  });
}

export async function listPartnerCustomExtras(
  partnerId: string,
  opts?: { activeOnly?: boolean },
): Promise<PartnerCustomExtra[]> {
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const store = await readStore();
  const rows = Array.isArray(store[id]) ? store[id] : [];
  if (opts?.activeOnly) return rows.filter((r) => r.isActive !== false);
  return rows;
}

export async function listPartnerCustomExtrasAsPricing(
  partnerId: string,
  opts?: { activeOnly?: boolean },
): Promise<ExtraServicePricing[]> {
  const rows = await listPartnerCustomExtras(partnerId, opts);
  return rows.map(partnerCustomToPricing);
}

export async function listAllPartnerCustomExtras(): Promise<PartnerCustomExtra[]> {
  const store = await readStore();
  const rows: PartnerCustomExtra[] = [];
  for (const list of Object.values(store)) {
    if (!Array.isArray(list)) continue;
    rows.push(...list);
  }
  return rows;
}

export async function findPartnerCustomExtra(
  extraServiceId: string,
): Promise<{ partnerId: string; extra: PartnerCustomExtra } | null> {
  const id = String(extraServiceId || "").trim();
  if (!id) return null;
  const store = await readStore();
  for (const [partnerId, rows] of Object.entries(store)) {
    if (!Array.isArray(rows)) continue;
    const extra = rows.find((r) => r.id === id);
    if (extra) return { partnerId, extra };
  }
  return null;
}

export async function createPartnerCustomExtra(
  partnerId: string,
  input: {
    name: string;
    description?: string;
    priceEur?: number;
    maxPriceEur?: number | null;
  },
): Promise<PartnerCustomExtra> {
  const pid = String(partnerId || "").trim();
  if (!pid) throw new Error("Partner required");
  const name = String(input.name || "").trim();
  if (name.length < 2) throw new Error("Name is too short");

  const price = Number(input.priceEur);
  const defaultPriceEur = Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0;
  const maxRaw = input.maxPriceEur;
  let maxPriceEur: number | null =
    maxRaw == null ? (defaultPriceEur > 0 ? defaultPriceEur : null) : Number(maxRaw);
  if (maxPriceEur != null && (!Number.isFinite(maxPriceEur) || maxPriceEur < 0)) maxPriceEur = null;
  if (maxPriceEur != null && maxPriceEur < defaultPriceEur) maxPriceEur = defaultPriceEur;

  const store = await readStore();
  const existing = Array.isArray(store[pid]) ? store[pid] : [];
  const baseSlug = slugifyExtraName(name) || "custom-extra";
  let slug = `p-${baseSlug}`;
  let n = 1;
  const used = new Set(existing.map((r) => r.slug));
  while (used.has(slug)) {
    slug = `p-${baseSlug}-${++n}`;
    if (n > 50) throw new Error("Could not allocate a unique slug");
  }

  const now = new Date().toISOString();
  const row: PartnerCustomExtra = {
    id: randomUUID(),
    slug,
    name,
    description: String(input.description || "").trim(),
    defaultPriceEur,
    maxPriceEur,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  store[pid] = [...existing, row];
  await writeStore(store);
  return row;
}
