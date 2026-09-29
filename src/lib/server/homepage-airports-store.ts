import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import { prisma } from "@/lib/prisma";

export type StoredHomepageAirport = {
  id: string;
  iata: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "homepage-airports.json");

type AirportDelegate = {
  findMany: (args?: object) => Promise<Array<Record<string, unknown>>>;
  aggregate: (args: object) => Promise<{ _max: { sortOrder: number | null } }>;
  create: (args: object) => Promise<Record<string, unknown>>;
  update: (args: object) => Promise<Record<string, unknown>>;
  delete: (args: object) => Promise<unknown>;
};

function defaultAirports(): StoredHomepageAirport[] {
  const now = new Date().toISOString();
  return getStaticPopularAirports().map((a, index) => ({
    id: a.iata,
    iata: a.iata,
    title: a.name,
    imageUrl: a.image,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));
}

async function readFileStore(): Promise<StoredHomepageAirport[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultAirports();
    return parsed.map((row, index) => {
      const item = row as Partial<StoredHomepageAirport>;
      return {
        id: String(item.id || item.iata || `airport-${index}`),
        iata: String(item.iata || "").toUpperCase(),
        title: String(item.title || "Airport"),
        imageUrl: String(item.imageUrl || ""),
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
        createdAt: String(item.createdAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
      };
    });
  } catch {
    const defaults = defaultAirports();
    await writeFileStore(defaults);
    return defaults;
  }
}

async function writeFileStore(rows: StoredHomepageAirport[]) {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
  } catch {
    /* Hosted filesystem is read-only. */
  }
}

function getDbDelegate(): AirportDelegate | null {
  try {
    const delegate = (prisma as unknown as { homepageAirport?: AirportDelegate }).homepageAirport;
    if (!delegate) return null;
    if (typeof delegate.findMany !== "function") return null;
    if (typeof delegate.aggregate !== "function") return null;
    if (typeof delegate.create !== "function") return null;
    return delegate;
  } catch {
    return null;
  }
}

function toStored(row: Record<string, unknown>): StoredHomepageAirport {
  return {
    id: String(row.id),
    iata: String(row.iata).toUpperCase(),
    title: String(row.title),
    imageUrl: String(row.imageUrl),
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
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
  title: string;
  iata: string;
  imageUrl: string;
}): Promise<StoredHomepageAirport> {
  const rows = await readFileStore();
  const now = new Date().toISOString();
  const row: StoredHomepageAirport = {
    id: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    iata: input.iata.toUpperCase(),
    imageUrl: input.imageUrl,
    sortOrder: rows.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  rows.push(row);
  await writeFileStore(rows);
  return row;
}

export async function listHomepageAirports(): Promise<StoredHomepageAirport[]> {
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
      markDbCircuitOpen("homepage-airports", error);
    } else {
      console.warn("[homepage-airports] DB list failed, using file store:", error);
    }
    return readFileStore();
  }
}

export async function createHomepageAirport(input: {
  title: string;
  iata: string;
  imageUrl: string;
}): Promise<StoredHomepageAirport> {
  const payload = {
    title: input.title.trim(),
    iata: input.iata.trim().toUpperCase(),
    imageUrl: input.imageUrl.trim(),
  };

  const db = getDbDelegate();
  if (!db) return createInFileStore(payload);

  try {
    const max = await db.aggregate({ _max: { sortOrder: true } });
    const row = await db.create({
      data: {
        ...payload,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    return toStored(row);
  } catch (error) {
    console.warn("[homepage-airports] DB create failed, using file store:", error);
    return createInFileStore(payload);
  }
}

export async function updateHomepageAirport(
  id: string,
  input: {
    title?: string;
    iata?: string;
    imageUrl?: string;
  },
): Promise<StoredHomepageAirport> {
  const applyFileUpdate = async () => {
    const rows = await readFileStore();
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) throw new Error("Airport card not found");
    const current = rows[index];
    const updated: StoredHomepageAirport = {
      ...current,
      title: input.title?.trim() ?? current.title,
      iata: input.iata ? input.iata.trim().toUpperCase() : current.iata,
      imageUrl: input.imageUrl?.trim() ?? current.imageUrl,
      updatedAt: new Date().toISOString(),
    };
    rows[index] = updated;
    await writeFileStore(rows);
    return updated;
  };

  const db = getDbDelegate();
  if (!db) return applyFileUpdate();

  try {
    const row = await db.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        iata: input.iata ? input.iata.trim().toUpperCase() : undefined,
        imageUrl: input.imageUrl?.trim(),
      },
    });
    return toStored(row);
  } catch (error) {
    console.warn("[homepage-airports] DB update failed, using file store:", error);
    return applyFileUpdate();
  }
}

export async function deleteHomepageAirport(id: string): Promise<void> {
  const deleteFromFile = async () => {
    const rows = await readFileStore();
    await writeFileStore(rows.filter((r) => r.id !== id));
  };

  const db = getDbDelegate();
  if (!db) {
    await deleteFromFile();
    return;
  }

  try {
    await db.delete({ where: { id } });
  } catch (error) {
    console.warn("[homepage-airports] DB delete failed, using file store:", error);
    await deleteFromFile();
  }
}

/** Persist a new display order from an ordered list of ids. */
export async function reorderHomepageAirports(orderedIds: string[]): Promise<StoredHomepageAirport[]> {
  const applyFileReorder = async () => {
    const rows = await readFileStore();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const now = new Date().toISOString();
    const next: StoredHomepageAirport[] = [];
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
    return listHomepageAirports();
  } catch (error) {
    console.warn("[homepage-airports] DB reorder failed, using file store:", error);
    return applyFileReorder();
  }
}
