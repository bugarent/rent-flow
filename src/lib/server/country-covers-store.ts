import "server-only";

import {
  BUILT_IN_COUNTRY_COVERS,
  clampFocal,
  normalizeCoverIso,
  type CountryCover,
  type CountryCoverCredit,
  type CountryCoverMap,
} from "@/lib/catalog/country-covers";
import { readFile, readFileForUpdate, withStoreLock, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import { createTtlCache } from "@/lib/server/ttl-cache";

type StoreShape = {
  covers: CountryCoverMap;
  /** Last automatic photo search per country (ISO time), so the web is searched once, not per visit. */
  autoAttempts?: Record<string, string>;
};

const cache = createTtlCache<CountryCoverMap>(60_000);

async function storePath() {
  return resolveDataFile("admin", "country-covers.json");
}

function cleanCredit(raw: unknown): CountryCoverCredit | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const author = typeof row.author === "string" ? row.author.trim().slice(0, 160) : "";
  const license = typeof row.license === "string" ? row.license.trim().slice(0, 60) : "";
  const url = typeof row.url === "string" ? row.url.trim() : "";
  if (!url.startsWith("https://")) return undefined;
  return { author, license, url };
}

function cleanCover(raw: unknown): CountryCover | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const webp = str(row.webp);
  const mobileWebp = str(row.mobileWebp) || webp;
  if (!webp) return null;
  return {
    webp,
    avif: str(row.avif) || undefined,
    mobileWebp,
    mobileAvif: str(row.mobileAvif) || undefined,
    focalX: clampFocal(row.focalX),
    width: Number(row.width) || 1600,
    height: Number(row.height) || 900,
    updatedAt: str(row.updatedAt) || undefined,
    source: row.source === "auto" ? "auto" : row.source === "admin" ? "admin" : undefined,
    credit: cleanCredit(row.credit),
  };
}

function parseStore(text: string | null): Required<StoreShape> {
  const empty = { covers: {}, autoAttempts: {} };
  if (!text) return empty;
  try {
    const parsed = JSON.parse(text) as Partial<StoreShape>;
    const covers: CountryCoverMap = {};
    for (const [iso, raw] of Object.entries(parsed.covers ?? {})) {
      const code = normalizeCoverIso(iso);
      const cover = cleanCover(raw);
      if (code && cover) covers[code] = cover;
    }
    const autoAttempts: Record<string, string> = {};
    for (const [iso, at] of Object.entries(parsed.autoAttempts ?? {})) {
      const code = normalizeCoverIso(iso);
      if (code && typeof at === "string") autoAttempts[code] = at;
    }
    return { covers, autoAttempts };
  } catch {
    return empty;
  }
}

async function readStore(): Promise<Required<StoreShape>> {
  try {
    return parseStore(await readFile(await storePath(), "utf8"));
  } catch {
    return { covers: {}, autoAttempts: {} };
  }
}

/** Admin uploads and automatic covers (no built-ins). */
export async function getUploadedCountryCovers(): Promise<CountryCoverMap> {
  return (await readStore()).covers;
}

export async function getCountryCoverAutoAttempts(): Promise<Record<string, string>> {
  return (await readStore()).autoAttempts;
}

/** Built-in landmark covers with admin uploads on top. */
export async function getPublicCountryCovers(): Promise<CountryCoverMap> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const merged = { ...BUILT_IN_COUNTRY_COVERS, ...(await getUploadedCountryCovers()) };
    cache.set(merged);
    return merged;
  } catch {
    return cache.peek() ?? BUILT_IN_COUNTRY_COVERS;
  }
}

async function updateStore(change: (store: Required<StoreShape>) => Required<StoreShape>): Promise<CountryCoverMap> {
  const path = await storePath();
  return withStoreLock(path, async () => {
    const current = parseStore(await readFileForUpdate(path));
    const next = change({ covers: { ...current.covers }, autoAttempts: { ...current.autoAttempts } });
    await ensureDataDir("admin");
    await writeFile(path, JSON.stringify(next satisfies StoreShape, null, 2), "utf8");
    cache.set({ ...BUILT_IN_COUNTRY_COVERS, ...next.covers });
    return next.covers;
  });
}

export async function saveCountryCover(iso: string, cover: CountryCover): Promise<CountryCoverMap> {
  const code = normalizeCoverIso(iso);
  if (!code) throw new Error("Invalid country");
  return updateStore((store) => ({ ...store, covers: { ...store.covers, [code]: cover } }));
}

/**
 * Records an automatic search so it is not repeated on every visit: `ok:<time>` is never retried
 * (an admin who removed that photo keeps it removed), `none:<time>` is retried later.
 */
export async function markCountryCoverAutoAttempt(iso: string, found: boolean): Promise<void> {
  const code = normalizeCoverIso(iso);
  if (!code) return;
  await updateStore((store) => ({
    ...store,
    autoAttempts: { ...store.autoAttempts, [code]: `${found ? "ok" : "none"}:${new Date().toISOString()}` },
  }));
}

/** Explicit admin action: drop the upload so the built-in cover (if any) shows again. */
export async function removeCountryCover(iso: string): Promise<CountryCoverMap> {
  const code = normalizeCoverIso(iso);
  if (!code) throw new Error("Invalid country");
  return updateStore((store) => {
    const covers = { ...store.covers };
    delete covers[code];
    return { ...store, covers };
  });
}
