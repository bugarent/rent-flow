import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { getPopularAirports as getStaticPopularAirports } from "@/lib/catalog/popular-airports";
import { prisma } from "@/lib/prisma";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";
import {
  cleanAirportTranslations,
  missingAirportInfoLocales,
  missingAirportSeoLocales,
  missingAirportTitleLocales,
  type AirportCardTranslations,
} from "@/lib/catalog/homepage-airport-i18n";
import type { Locale } from "@/lib/i18n/config";

export type StoredHomepageAirport = {
  id: string;
  iata: string;
  title: string;
  imageUrl: string;
  infoText: string;
  /** Google meta title / description; stored only in the published JSON (like infoText). */
  seoTitle: string;
  seoDescription: string;
  /** Per-language title/details/SEO; stored only in the published JSON (like infoText). */
  translations: AirportCardTranslations;
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
    infoText: "",
    seoTitle: "",
    seoDescription: "",
    translations: {},
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
        infoText: String(item.infoText || ""),
        seoTitle: String(item.seoTitle || ""),
        seoDescription: String(item.seoDescription || ""),
        translations: cleanAirportTranslations(item.translations),
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
        createdAt: String(item.createdAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
      };
    });
  } catch {
    return [];
  }
}

async function writeFileStore(rows: StoredHomepageAirport[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
  revalidatePublishedContent();
}

async function publishFromDb(db: AirportDelegate, saved?: StoredHomepageAirport) {
  const previous = await readFileStore();
  const previousById = new Map(previous.map((row) => [row.id, row]));
  const rows = (await db.findMany({ orderBy: { sortOrder: "asc" } })).map((row) => {
    const stored = toStored(row);
    const prev = previousById.get(stored.id);
    return {
      ...stored,
      infoText: prev?.infoText || "",
      seoTitle: prev?.seoTitle || "",
      seoDescription: prev?.seoDescription || "",
      translations: prev?.translations || {},
    };
  });
  if (saved) {
    const index = rows.findIndex((row) => row.id === saved.id);
    if (index >= 0) rows[index] = { ...rows[index], ...saved };
    else rows.push(saved);
    rows.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  await writeFileStore(rows);
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
    infoText: String(row.infoText || ""),
    seoTitle: String(row.seoTitle || ""),
    seoDescription: String(row.seoDescription || ""),
    translations: cleanAirportTranslations(row.translations),
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

function mergeInfoTranslations(
  current: AirportCardTranslations,
  translated: Partial<Record<Locale, string>>,
): AirportCardTranslations {
  const next: AirportCardTranslations = { ...current };
  for (const [code, text] of Object.entries(translated)) {
    const infoText = String(text || "").trim();
    if (!infoText) continue;
    const lang = code as Locale;
    next[lang] = { ...next[lang], infoText };
  }
  return cleanAirportTranslations(next);
}

function dropInfoTranslations(current: AirportCardTranslations): AirportCardTranslations {
  const next: AirportCardTranslations = {};
  for (const [code, row] of Object.entries(current)) {
    if (!row) continue;
    const { infoText: _infoText, ...rest } = row;
    if (Object.values(rest).some((value) => value?.trim())) next[code as Locale] = rest;
  }
  return next;
}

/** Fields whose automatic translations follow the base text (title and SEO lines). */
const SHORT_FIELDS = ["title", "seoTitle", "seoDescription"] as const;
type ShortField = (typeof SHORT_FIELDS)[number];

/**
 * After the base text of some short fields changed, drop their old automatic
 * translations; a translation the admin typed differently in this save stays.
 */
function pruneChangedTranslations(
  incoming: AirportCardTranslations,
  stored: AirportCardTranslations,
  changed: ShortField[],
): AirportCardTranslations {
  if (!changed.length) return incoming;
  const out: AirportCardTranslations = {};
  for (const [code, row] of Object.entries(incoming)) {
    const lang = code as Locale;
    if (!row) continue;
    const entry = { ...row };
    for (const field of changed) {
      if (entry[field] && entry[field] === stored[lang]?.[field]) delete entry[field];
    }
    if (Object.values(entry).some((value) => value?.trim())) out[lang] = entry;
  }
  return out;
}

async function fillSeoLocales(airport: StoredHomepageAirport, locales: Locale[]) {
  if (!locales.length) return airport;
  const { translateAirportTitle } = await import("@/lib/server/translate-airport-preface");
  const [titles, descriptions] = await Promise.all([
    airport.seoTitle.trim() ? translateAirportTitle(airport.seoTitle, locales) : Promise.resolve({}),
    airport.seoDescription.trim()
      ? translateAirportTitle(airport.seoDescription, locales, 170)
      : Promise.resolve({}),
  ]);
  const next: AirportCardTranslations = { ...airport.translations };
  for (const lang of locales) {
    const seoTitle = (titles as Partial<Record<Locale, string>>)[lang];
    const seoDescription = (descriptions as Partial<Record<Locale, string>>)[lang];
    if (!seoTitle && !seoDescription) continue;
    next[lang] = {
      ...next[lang],
      ...(seoTitle && !next[lang]?.seoTitle ? { seoTitle } : {}),
      ...(seoDescription && !next[lang]?.seoDescription ? { seoDescription } : {}),
    };
  }
  return (await persistInfoTranslations(airport.id, next)) ?? airport;
}

const prefaceQueue = new Map<string, Promise<unknown>>();

function enqueuePreface<T>(id: string, job: () => Promise<T>): Promise<T> {
  const prev = prefaceQueue.get(id) ?? Promise.resolve();
  const run = prev.then(job, job);
  prefaceQueue.set(
    id,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function persistInfoTranslations(id: string, translations: AirportCardTranslations) {
  const rows = await readFileStore();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const updated: StoredHomepageAirport = {
    ...rows[index],
    translations: cleanAirportTranslations(translations),
    updatedAt: new Date().toISOString(),
  };
  rows[index] = updated;
  await writeFileStore(rows);
  return updated;
}

async function fillPrefaceLocales(airport: StoredHomepageAirport, locales: Locale[]) {
  if (!locales.length || !airport.infoText.trim()) return airport;
  const { translateAirportPreface } = await import("@/lib/server/translate-airport-preface");
  const chunkSize = 5;
  let current = airport;
  for (let i = 0; i < locales.length; i += chunkSize) {
    const chunk = locales.slice(i, i + chunkSize);
    const translated = await translateAirportPreface(current.infoText, chunk);
    if (!Object.keys(translated).length) continue;
    const saved = await persistInfoTranslations(current.id, mergeInfoTranslations(current.translations, translated));
    if (saved) current = saved;
  }
  return current;
}

async function fillTitleLocales(airport: StoredHomepageAirport, locales: Locale[]) {
  if (!locales.length || !airport.title.trim()) return airport;
  const { translateAirportTitle } = await import("@/lib/server/translate-airport-preface");
  const translated = await translateAirportTitle(airport.title, locales);
  if (!Object.keys(translated).length) return airport;
  const next: AirportCardTranslations = { ...airport.translations };
  for (const [code, title] of Object.entries(translated)) {
    if (!title) continue;
    next[code as Locale] = { ...next[code as Locale], title };
  }
  return (await persistInfoTranslations(airport.id, next)) ?? airport;
}

/** Store missing title + preface translations. The visitor's language is written first. */
export async function ensureAirportPrefaceTranslations(
  airport: StoredHomepageAirport,
  preferLocale?: string,
  opts?: { onlyPreferred?: boolean },
): Promise<StoredHomepageAirport> {
  if (
    !missingAirportInfoLocales(airport).length &&
    !missingAirportTitleLocales(airport).length &&
    !missingAirportSeoLocales(airport).length
  ) {
    return airport;
  }
  return enqueuePreface(airport.id, async () => {
    let fresh = (await readFileStore()).find((row) => row.id === airport.id) ?? airport;
    const seo = missingAirportSeoLocales(fresh);
    if (seo.length) {
      fresh = await fillSeoLocales(fresh, opts?.onlyPreferred ? seo.filter((code) => code === preferLocale) : seo);
    }
    const titles = missingAirportTitleLocales(fresh);
    if (titles.length) {
      // Titles are short: every missing language in one request (only the visitor's on a page view).
      const want = opts?.onlyPreferred ? titles.filter((code) => code === preferLocale) : titles;
      fresh = await fillTitleLocales(fresh, want);
      if (opts?.onlyPreferred && titles.length > want.length) {
        const saved = fresh;
        void enqueuePreface(saved.id, () => fillTitleLocales(saved, missingAirportTitleLocales(saved)));
      }
    }
    const stillMissing = missingAirportInfoLocales(fresh);
    if (!stillMissing.length) return fresh;
    const preferred = stillMissing.find((code) => code === preferLocale);
    if (opts?.onlyPreferred) {
      if (!preferred) return fresh;
      const saved = await fillPrefaceLocales(fresh, [preferred]);
      const rest = missingAirportInfoLocales(saved);
      if (rest.length) void enqueuePreface(saved.id, () => fillPrefaceLocales(saved, rest));
      return saved;
    }
    const ordered = preferred ? [preferred, ...stillMissing.filter((code) => code !== preferred)] : stillMissing;
    return fillPrefaceLocales(fresh, ordered);
  });
}

async function createInFileStore(input: {
  title: string;
  iata: string;
  imageUrl: string;
  infoText: string;
  seoTitle: string;
  seoDescription: string;
  translations: AirportCardTranslations;
}): Promise<StoredHomepageAirport> {
  const rows = await readFileStore();
  const now = new Date().toISOString();
  const row: StoredHomepageAirport = {
    id: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    iata: input.iata.toUpperCase(),
    imageUrl: input.imageUrl,
    infoText: input.infoText,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    translations: input.translations,
    sortOrder: rows.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  rows.push(row);
  await writeFileStore(rows);
  return row;
}

export async function listHomepageAirports(): Promise<StoredHomepageAirport[]> {
  const published = await readFileStore();
  if (published.length) return published;

  const { isDbCircuitOpen, markDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) return published;

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
  infoText?: string;
  seoTitle?: string;
  seoDescription?: string;
  translations?: unknown;
}): Promise<StoredHomepageAirport> {
  const payload = {
    title: input.title.trim(),
    iata: input.iata.trim().toUpperCase(),
    imageUrl: input.imageUrl.trim(),
    infoText: input.infoText?.trim() ?? "",
    seoTitle: input.seoTitle?.trim() ?? "",
    seoDescription: input.seoDescription?.trim() ?? "",
    translations: cleanAirportTranslations(input.translations),
  };

  const db = getDbDelegate();
  const created = await (async () => {
    if (!db) return createInFileStore(payload);
    try {
      const max = await db.aggregate({ _max: { sortOrder: true } });
      const row = await db.create({
        data: {
          title: payload.title,
          iata: payload.iata,
          imageUrl: payload.imageUrl,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
      const stored = {
        ...toStored(row),
        infoText: payload.infoText,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        translations: payload.translations,
      };
      await publishFromDb(db, stored);
      return stored;
    } catch (error) {
      console.warn("[homepage-airports] DB create failed, using file store:", error);
      return createInFileStore(payload);
    }
  })();
  return ensureAirportPrefaceTranslations(created);
}

export async function updateHomepageAirport(
  id: string,
  input: {
    title?: string;
    iata?: string;
    imageUrl?: string;
    infoText?: string;
    seoTitle?: string;
    seoDescription?: string;
    translations?: unknown;
  },
): Promise<StoredHomepageAirport> {
  const before = (await readFileStore()).find((row) => row.id === id);
  let nextTranslations =
    input.translations === undefined ? undefined : cleanAirportTranslations(input.translations);
  // A new base title / SEO line makes its old automatic translations wrong.
  if (before) {
    const changed = SHORT_FIELDS.filter(
      (field) => input[field] !== undefined && input[field]!.trim() !== before[field].trim(),
    );
    if (changed.length) {
      nextTranslations = pruneChangedTranslations(nextTranslations ?? before.translations, before.translations, changed);
    }
  }
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
      infoText: input.infoText?.trim() ?? current.infoText,
      seoTitle: input.seoTitle?.trim() ?? current.seoTitle,
      seoDescription: input.seoDescription?.trim() ?? current.seoDescription,
      translations: nextTranslations ?? current.translations,
      updatedAt: new Date().toISOString(),
    };
    rows[index] = updated;
    await writeFileStore(rows);
    return updated;
  };

  const previousInfo = (await readFileStore()).find((row) => row.id === id)?.infoText ?? "";
  const db = getDbDelegate();
  const updated = await (async () => {
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
      const previous = (await readFileStore()).find((row) => row.id === id);
      const stored = {
        ...toStored(row),
        infoText: input.infoText?.trim() ?? previous?.infoText ?? "",
        seoTitle: input.seoTitle?.trim() ?? previous?.seoTitle ?? "",
        seoDescription: input.seoDescription?.trim() ?? previous?.seoDescription ?? "",
        translations: nextTranslations ?? previous?.translations ?? {},
      };
      await publishFromDb(db, stored);
      return stored;
    } catch (error) {
      console.warn("[homepage-airports] DB update failed, using file store:", error);
      return applyFileUpdate();
    }
  })();
  const infoChanged =
    input.infoText !== undefined && input.infoText.trim() !== previousInfo.trim();
  const base = infoChanged
    ? (await persistInfoTranslations(updated.id, dropInfoTranslations(updated.translations))) ?? updated
    : updated;
  return ensureAirportPrefaceTranslations(base);
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
    await publishFromDb(db);
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
    await publishFromDb(db);
    return listHomepageAirports();
  } catch (error) {
    console.warn("[homepage-airports] DB reorder failed, using file store:", error);
    return applyFileReorder();
  }
}
