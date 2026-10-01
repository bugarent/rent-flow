import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import {
  resolveCheckoutSlot,
} from "@/lib/extras/checkout-slot";
import {
  toExtraServicePricing,
  type ExtraServicePricing,
} from "@/lib/extras/pricing";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import type { StoredExtraService } from "./types";

async function extrasPath() {
  return resolveDataFile("catalog", "extra-services.json");
}

export function toPricing(row: StoredExtraService): ExtraServicePricing {
  return toExtraServicePricing({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isTpl: row.isTpl,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    defaultPriceEur: row.defaultPriceEur,
    minPriceEur: row.minPriceEur,
    maxPriceEur: row.maxPriceEur,
    maxPeriodEur: row.maxPeriodEur,
    checkoutSlot: row.checkoutSlot,
  });
}

export function fromPrismaRow(row: {
  id: string;
  slug: string;
  name: unknown;
  description: unknown;
  isTpl: boolean;
  isActive: boolean;
  sortOrder: number;
  defaultPriceEur: unknown;
  minPriceEur: unknown;
  maxPriceEur: unknown;
}): StoredExtraService {
  const priced = toExtraServicePricing(row);
  const now = new Date().toISOString();
  return {
    id: priced.id,
    slug: priced.slug,
    name: priced.name,
    description: priced.description || "",
    isTpl: priced.isTpl,
    isActive: priced.isActive,
    sortOrder: priced.sortOrder,
    defaultPriceEur: priced.defaultPriceEur,
    minPriceEur: priced.minPriceEur,
    maxPriceEur: priced.maxPriceEur,
    maxPeriodEur: priced.maxPeriodEur,
    checkoutSlot: priced.checkoutSlot,
    createdAt: now,
    updatedAt: now,
  };
}

function defaultExtras(): StoredExtraService[] {
  const now = new Date().toISOString();
  return ([
    {
      id: "file-tpl",
      slug: "tpl",
      name: "TPL — Third Party Liability",
      description: "Included free by default on every rental.",
      isTpl: true,
      isActive: true,
      sortOrder: 0,
      defaultPriceEur: 0,
      minPriceEur: 0,
      maxPriceEur: 0,
      checkoutSlot: "tpl",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "file-basic-coverage",
      slug: "basic-coverage",
      name: "Basic coverage",
      description: "Standard collision excess cover.",
      isTpl: false,
      isActive: true,
      sortOrder: 5,
      defaultPriceEur: 0,
      minPriceEur: 0,
      maxPriceEur: 0,
      checkoutSlot: "basic",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "file-full-protection",
      slug: "full-protection",
      name: "Full coverage",
      description: "Full protection with 0 franchise where available.",
      isTpl: false,
      isActive: true,
      sortOrder: 8,
      defaultPriceEur: 15,
      minPriceEur: 8,
      maxPriceEur: 40,
      checkoutSlot: "full",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "file-baby-seat",
      slug: "baby-seat",
      name: "Baby Seat",
      description: "Child safety seat, daily rate.",
      isTpl: false,
      isActive: true,
      sortOrder: 10,
      defaultPriceEur: 8,
      minPriceEur: 5,
      maxPriceEur: 15,
      checkoutSlot: "none",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "file-gps",
      slug: "gps",
      name: "GPS Navigation",
      description: "Portable GPS unit, daily rate.",
      isTpl: false,
      isActive: true,
      sortOrder: 20,
      defaultPriceEur: 6,
      minPriceEur: 3,
      maxPriceEur: 12,
      checkoutSlot: "none",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "file-additional-driver",
      slug: "additional-driver",
      name: "Additional Driver",
      description: "Extra authorized driver, daily rate.",
      isTpl: false,
      isActive: true,
      sortOrder: 30,
      defaultPriceEur: 10,
      minPriceEur: 5,
      maxPriceEur: 20,
      checkoutSlot: "driver",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "file-cross-border",
      slug: "cross-border",
      name: "Border crossing",
      description: "Permission to take the vehicle across state borders.",
      isTpl: false,
      isActive: true,
      sortOrder: 35,
      defaultPriceEur: 0,
      minPriceEur: 0,
      maxPriceEur: 500,
      checkoutSlot: "none",
      createdAt: now,
      updatedAt: now,
    },
  ] as Array<Omit<StoredExtraService, "maxPeriodEur">>).map((row) => ({
    ...row,
    maxPeriodEur: null,
  }));
}

export async function writeFileStore(rows: StoredExtraService[]) {
  await ensureDataDir("catalog");
  await writeFile(await extrasPath(), JSON.stringify(rows, null, 2), "utf8");
}

export async function ensureDefaultExtras(rows: StoredExtraService[]): Promise<StoredExtraService[]> {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  let changed = false;
  for (const seed of defaultExtras()) {
    const existing = bySlug.get(seed.slug);
    if (!existing) {
      bySlug.set(seed.slug, seed);
      changed = true;
      continue;
    }
    if (existing.checkoutSlot === "none" && seed.checkoutSlot !== "none") {
      existing.checkoutSlot = seed.checkoutSlot;
      changed = true;
    }
    // Drop obsolete tire/undercarriage disclaimers from seeded insurance copy.
    if (
      (seed.slug === "basic-coverage" || seed.slug === "full-protection") &&
      existing.description !== seed.description &&
      /undercarriage|wheels\/tires may still/i.test(existing.description)
    ) {
      existing.description = seed.description;
      existing.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  const next = [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  if (changed) await writeFileStore(next);
  return next;
}

export async function readFileStore(): Promise<StoredExtraService[]> {
  try {
    const raw = await readFile(await extrasPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      // Do not rewrite on every broken parse during hot reads — return seeds in memory.
      return defaultExtras();
    }
    return parsed.map((row, index) => {
      const item = row as Partial<StoredExtraService>;
      const name = String(item.name || "Extra");
      const slug = String(item.slug || `extra-${index}`);
      const description = String(item.description || "");
      const isTpl = Boolean(item.isTpl);
      return {
        id: String(item.id || `extra-${index}`),
        slug,
        name,
        description,
        isTpl,
        isActive: item.isActive !== false,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 100 + index,
        defaultPriceEur: typeof item.defaultPriceEur === "number" ? item.defaultPriceEur : 0,
        minPriceEur: item.minPriceEur == null ? null : Number(item.minPriceEur),
        maxPriceEur: item.maxPriceEur == null ? null : Number(item.maxPriceEur),
        maxPeriodEur:
          item.maxPeriodEur == null || !Number.isFinite(Number(item.maxPeriodEur)) || Number(item.maxPeriodEur) < 0
            ? null
            : Number(item.maxPeriodEur),
        checkoutSlot: resolveCheckoutSlot({
          checkoutSlot: item.checkoutSlot,
          slug,
          isTpl,
          name,
        }),
        createdAt: String(item.createdAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
      };
    });
  } catch {
    return defaultExtras();
  }
}

export async function allocateSlug(base: string, existing: StoredExtraService[]) {
  let slug = base;
  let n = 1;
  const taken = new Set(existing.map((r) => r.slug));
  while (taken.has(slug)) {
    slug = `${base}-${++n}`;
    if (n > 50) throw new Error("Could not allocate a unique slug");
  }
  return slug;
}
