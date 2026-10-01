import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  type HelpArticle,
  type HelpCategory,
  type HelpCenterConfig,
  type HelpTopic,
} from "@/lib/catalog/help-center";
import { DEFAULT_HELP_CENTER } from "@/lib/catalog/help-center-defaults";
import type { HelpFaqItem } from "@/lib/catalog/help-faq";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "help-center.json");

type CacheEntry = { at: number; value: HelpCenterConfig };
let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15_000;

function setCache(value: HelpCenterConfig) {
  memoryCache = { at: Date.now(), value };
}

function normalizeArticle(raw: Partial<HelpArticle>, index: number): HelpArticle | null {
  const question = String(raw.question || "").trim();
  const answer = String(raw.answer || "").trim();
  if (!question || !answer) return null;
  return {
    id: String(raw.id || randomUUID()).trim() || randomUUID(),
    question: question.slice(0, 500),
    answer: answer.slice(0, 8000),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    trending: Boolean(raw.trending),
  };
}

function normalizeTopic(raw: Partial<HelpTopic>, index: number): HelpTopic | null {
  const title = String(raw.title || "").trim();
  if (!title) return null;
  const articles = Array.isArray(raw.articles)
    ? raw.articles
        .map((a, i) => normalizeArticle(a as Partial<HelpArticle>, i))
        .filter((a): a is HelpArticle => Boolean(a))
        .map((a, i) => ({ ...a, sortOrder: i }))
    : [];
  return {
    id: String(raw.id || randomUUID()).trim() || randomUUID(),
    title: title.slice(0, 120),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    articles,
  };
}

function normalizeCategory(raw: Partial<HelpCategory>, index: number): HelpCategory | null {
  const title = String(raw.title || "").trim();
  if (!title) return null;
  const topics = Array.isArray(raw.topics)
    ? raw.topics
        .map((t, i) => normalizeTopic(t as Partial<HelpTopic>, i))
        .filter((t): t is HelpTopic => Boolean(t))
        .map((t, i) => ({ ...t, sortOrder: i }))
    : [];
  return {
    id: String(raw.id || randomUUID()).trim() || randomUUID(),
    title: title.slice(0, 120),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    topics,
  };
}

function normalizeConfig(parsed: Partial<HelpCenterConfig>): HelpCenterConfig | null {
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories
        .map((c, i) => normalizeCategory(c as Partial<HelpCategory>, i))
        .filter((c): c is HelpCategory => Boolean(c))
        .map((c, i) => ({ ...c, sortOrder: i }))
    : [];
  if (!categories.length) return null;
  return {
    categories,
    updatedAt: String(parsed.updatedAt || new Date().toISOString()),
  };
}

async function writeConfig(config: HelpCenterConfig) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
}

export async function getHelpCenterConfig(): Promise<HelpCenterConfig> {
  if (memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) {
    return memoryCache.value;
  }

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const normalized = normalizeConfig(JSON.parse(raw) as Partial<HelpCenterConfig>);
    if (normalized) {
      setCache(normalized);
      return normalized;
    }
  } catch {
    /* miss or corrupt */
  }

  const seeded = { ...DEFAULT_HELP_CENTER, updatedAt: new Date().toISOString() };
  setCache(seeded);
  void writeConfig(seeded).catch(() => {
    /* ignore seed write errors on hot path */
  });
  return seeded;
}

export async function saveHelpCenterConfig(
  categoriesInput: readonly unknown[],
): Promise<HelpCenterConfig> {
  const categories = categoriesInput
    .map((c, i) => normalizeCategory(c as Partial<HelpCategory>, i))
    .filter((c): c is HelpCategory => Boolean(c))
    .map((c, i) => ({ ...c, sortOrder: i }));
  const next: HelpCenterConfig = {
    categories,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  setCache(next);
  return next;
}

/** Flat FAQ list for older Help accordion consumers. */
export async function getPublicHelpFaqFlat(): Promise<HelpFaqItem[]> {
  const config = await getHelpCenterConfig();
  return config.categories.flatMap((c) =>
    c.topics.flatMap((t) =>
      t.articles.map((a) => ({
        id: a.id,
        question: a.question,
        answer: a.answer,
        sortOrder: a.sortOrder,
      })),
    ),
  );
}
