import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VEHICLE_CATEGORIES } from "@/lib/catalog/categories";
import type { MappedCarModel } from "@/lib/catalog/car-models";
import { parseMappedModels, summarizeMappedModels } from "@/lib/cars/category-mapping";
import { prisma } from "@/lib/prisma";

export type StoredHomepageCategory = {
  id: string;
  slug: string;
  name: string;
  details: string;
  imageUrl: string;
  mappedModels: MappedCarModel[];
  sortOrder: number;
  /** When false, hidden from homepage filter and admin category cards. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "homepage-categories.json");

type CategoryDelegate = {
  findMany: (args?: object) => Promise<Array<Record<string, unknown>>>;
  findUnique: (args: object) => Promise<Record<string, unknown> | null>;
  aggregate: (args: object) => Promise<{ _max: { sortOrder: number | null } }>;
  create: (args: object) => Promise<Record<string, unknown>>;
  update: (args: object) => Promise<Record<string, unknown>>;
  delete: (args: object) => Promise<unknown>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "category";
}

function defaultCategories(): StoredHomepageCategory[] {
  const now = new Date().toISOString();
  return VEHICLE_CATEGORIES.map((c, index) => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    details: summarizeMappedModels(c.mappedModels ?? []) || c.model,
    imageUrl: c.image,
    mappedModels: c.mappedModels ?? [],
    sortOrder: index,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

async function readFileStore(): Promise<StoredHomepageCategory[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultCategories();
    return parsed.map((row, index) => {
      const item = row as Partial<StoredHomepageCategory>;
      return {
        id: String(item.id || `cat-${index}`),
        slug: String(item.slug || item.id || `cat-${index}`),
        name: String(item.name || "Category"),
        details: String(item.details || ""),
        imageUrl: String(item.imageUrl || ""),
        mappedModels: parseMappedModels(item.mappedModels),
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
        isActive: item.isActive !== false,
        createdAt: String(item.createdAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
      };
    });
  } catch {
    const defaults = defaultCategories();
    await writeFileStore(defaults);
    return defaults;
  }
}

async function writeFileStore(rows: StoredHomepageCategory[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

/** Prefer file store when Prisma delegate is missing or DB is unreachable. */
function getDbDelegate(): CategoryDelegate | null {
  try {
    const delegate = (prisma as unknown as { homepageCategory?: CategoryDelegate }).homepageCategory;
    if (!delegate) return null;
    if (typeof delegate.findMany !== "function") return null;
    if (typeof delegate.aggregate !== "function") return null;
    if (typeof delegate.create !== "function") return null;
    return delegate;
  } catch {
    return null;
  }
}

function toStored(row: Record<string, unknown>): StoredHomepageCategory {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    details: String(row.details ?? ""),
    imageUrl: String(row.imageUrl),
    mappedModels: parseMappedModels(row.mappedModels),
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
    isActive: row.isActive !== false,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt ?? new Date().toISOString()),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt ?? new Date().toISOString()),
  };
}

async function createInFileStore(input: {
  name: string;
  details: string;
  imageUrl: string;
  mappedModels: MappedCarModel[];
  slug?: string;
}): Promise<StoredHomepageCategory> {
  const rows = await readFileStore();
  const slugBase = slugify(input.slug || input.name);
  let slug = slugBase;
  let n = 2;
  while (rows.some((r) => r.slug === slug)) {
    slug = `${slugBase}-${n++}`;
  }
  const now = new Date().toISOString();
  const row: StoredHomepageCategory = {
    id: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    slug,
    name: input.name,
    details: input.details,
    imageUrl: input.imageUrl,
    mappedModels: input.mappedModels,
    sortOrder: rows.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  rows.push(row);
  await writeFileStore(rows);
  return row;
}

export async function listHomepageCategories(): Promise<StoredHomepageCategory[]> {
  const { isDbCircuitOpen, markDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return readFileStore();

  const db = getDbDelegate();
  if (!db) return readFileStore();

  try {
    const rows = await db.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map(toStored);
  } catch (error) {
    const { isDbOfflineError } = await import("@/lib/server/db-errors");
    if (isDbOfflineError(error)) {
      markDbCircuitOpen("homepage-categories", error);
    } else {
      console.warn("[homepage-categories] DB list failed, using file store:", error);
    }
    return readFileStore();
  }
}

export async function createHomepageCategory(input: {
  name: string;
  details: string;
  imageUrl: string;
  mappedModels: MappedCarModel[];
  slug?: string;
}): Promise<StoredHomepageCategory> {
  const mappedModels = input.mappedModels ?? [];
  const details = input.details.trim() || summarizeMappedModels(mappedModels) || input.name;
  const payload = { ...input, details, mappedModels };

  const db = getDbDelegate();
  if (!db) return createInFileStore(payload);

  try {
    const max = await db.aggregate({ _max: { sortOrder: true } });
    const slugBase = slugify(input.slug || input.name);
    let slug = slugBase;
    let n = 2;
    while (await db.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${n++}`;
    }
    const row = await db.create({
      data: {
        name: input.name,
        details,
        imageUrl: input.imageUrl,
        mappedModels,
        slug,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        isActive: true,
      },
    });
    return toStored(row);
  } catch (error) {
    // Retry without isActive if column is missing until migration.
    try {
      const max = await db.aggregate({ _max: { sortOrder: true } });
      const slugBase = slugify(input.slug || input.name);
      let slug = slugBase;
      let n = 2;
      while (await db.findUnique({ where: { slug } })) {
        slug = `${slugBase}-${n++}`;
      }
      const row = await db.create({
        data: {
          name: input.name,
          details,
          imageUrl: input.imageUrl,
          mappedModels,
          slug,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
      return { ...toStored(row), isActive: true };
    } catch {
      console.warn("[homepage-categories] DB create failed, using file store:", error);
      return createInFileStore(payload);
    }
  }
}

export async function updateHomepageCategory(
  id: string,
  input: {
    name?: string;
    details?: string;
    imageUrl?: string;
    mappedModels?: MappedCarModel[];
    isActive?: boolean;
  },
): Promise<StoredHomepageCategory> {
  const db = getDbDelegate();

  const applyFileUpdate = async () => {
    const rows = await readFileStore();
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) throw new Error("Category not found");
    const current = rows[index];
    const mappedModels = input.mappedModels ?? current.mappedModels;
    const updated: StoredHomepageCategory = {
      ...current,
      name: input.name ?? current.name,
      imageUrl: input.imageUrl ?? current.imageUrl,
      mappedModels,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : current.isActive,
      details:
        input.mappedModels !== undefined
          ? input.details?.trim() || summarizeMappedModels(mappedModels)
          : (input.details ?? current.details),
      updatedAt: new Date().toISOString(),
    };
    rows[index] = updated;
    await writeFileStore(rows);
    return updated;
  };

  if (!db) return applyFileUpdate();

  try {
    const data: {
      name?: string;
      details?: string;
      imageUrl?: string;
      mappedModels?: MappedCarModel[];
      isActive?: boolean;
    } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
    if (input.mappedModels !== undefined) {
      data.mappedModels = input.mappedModels;
      data.details = input.details?.trim() || summarizeMappedModels(input.mappedModels);
    } else if (input.details !== undefined) {
      data.details = input.details;
    }
    try {
      const row = await db.update({ where: { id }, data });
      return toStored(row);
    } catch {
      const { isActive: _ignored, ...withoutActive } = data;
      const row = await db.update({ where: { id }, data: withoutActive });
      const stored = toStored(row);
      if (input.isActive !== undefined) {
        return applyFileUpdate();
      }
      return stored;
    }
  } catch (error) {
    console.warn("[homepage-categories] DB update failed, using file store:", error);
    return applyFileUpdate();
  }
}

export async function deleteHomepageCategory(id: string): Promise<void> {
  const db = getDbDelegate();

  const deleteFromFile = async () => {
    const rows = await readFileStore();
    await writeFileStore(rows.filter((r) => r.id !== id));
  };

  if (!db) {
    await deleteFromFile();
    return;
  }

  try {
    await db.delete({ where: { id } });
  } catch (error) {
    console.warn("[homepage-categories] DB delete failed, using file store:", error);
    await deleteFromFile();
  }
}

/** Persist a new display order from an ordered list of ids. */
export async function reorderHomepageCategories(orderedIds: string[]): Promise<StoredHomepageCategory[]> {
  const applyFileReorder = async () => {
    const rows = await readFileStore();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const now = new Date().toISOString();
    const next: StoredHomepageCategory[] = [];
    for (const id of orderedIds) {
      const row = byId.get(id);
      if (!row) continue;
      next.push({ ...row, sortOrder: next.length, updatedAt: now });
      byId.delete(id);
    }
    for (const row of byId.values()) {
      next.push({ ...row, sortOrder: next.length, updatedAt: now });
    }
    await writeFileStore(next);
    return next;
  };

  const db = getDbDelegate();
  if (!db) return applyFileReorder();

  try {
    await Promise.all(
      orderedIds.map((id, index) => db.update({ where: { id }, data: { sortOrder: index } })),
    );
    return listHomepageCategories();
  } catch (error) {
    console.warn("[homepage-categories] DB reorder failed, using file store:", error);
    return applyFileReorder();
  }
}
