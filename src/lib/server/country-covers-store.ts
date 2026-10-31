import "server-only";

import {
  BUILT_IN_COUNTRY_COVERS,
  clampFocal,
  normalizeCoverIso,
  type CountryCover,
  type CountryCoverMap,
} from "@/lib/catalog/country-covers";
import { readFile, readFileForUpdate, withStoreLock, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import { createTtlCache } from "@/lib/server/ttl-cache";

type StoreShape = { covers: CountryCoverMap };

const cache = createTtlCache<CountryCoverMap>(60_000);

async function storePath() {
  return resolveDataFile("admin", "country-covers.json");
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
  };
}

function parseStore(text: string | null): CountryCoverMap {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as Partial<StoreShape>;
    const out: CountryCoverMap = {};
    for (const [iso, raw] of Object.entries(parsed.covers ?? {})) {
      const code = normalizeCoverIso(iso);
      const cover = cleanCover(raw);
      if (code && cover) out[code] = cover;
    }
    return out;
  } catch {
    return {};
  }
}

/** Admin uploads only (no built-ins). */
export async function getUploadedCountryCovers(): Promise<CountryCoverMap> {
  try {
    return parseStore(await readFile(await storePath(), "utf8"));
  } catch {
    return {};
  }
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

async function updateStore(change: (covers: CountryCoverMap) => CountryCoverMap): Promise<CountryCoverMap> {
  const path = await storePath();
  return withStoreLock(path, async () => {
    const current = parseStore(await readFileForUpdate(path));
    const next = change({ ...current });
    await ensureDataDir("admin");
    await writeFile(path, JSON.stringify({ covers: next } satisfies StoreShape, null, 2), "utf8");
    const merged = { ...BUILT_IN_COUNTRY_COVERS, ...next };
    cache.set(merged);
    return next;
  });
}

export async function saveCountryCover(iso: string, cover: CountryCover): Promise<CountryCoverMap> {
  const code = normalizeCoverIso(iso);
  if (!code) throw new Error("Invalid country");
  return updateStore((covers) => ({ ...covers, [code]: cover }));
}

/** Explicit admin action: drop the upload so the built-in cover (if any) shows again. */
export async function removeCountryCover(iso: string): Promise<CountryCoverMap> {
  const code = normalizeCoverIso(iso);
  if (!code) throw new Error("Invalid country");
  return updateStore((covers) => {
    delete covers[code];
    return covers;
  });
}
