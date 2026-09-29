import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { HomepageInfoIconKey } from "@/lib/catalog/homepage-info-icons";
import { HOMEPAGE_INFO_ICON_KEYS } from "@/lib/catalog/homepage-info-icons";
import type {
  HomepageInfoBlock,
  HomepageInfoContent,
  HomepageInfoSection,
} from "@/lib/catalog/homepage-info";
import { createTtlCache } from "@/lib/server/ttl-cache";

export type { HomepageInfoBlock, HomepageInfoContent, HomepageInfoSection };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "homepage-info-blocks.json");
const cache = createTtlCache<HomepageInfoContent>(20_000);

function nowIso() {
  return new Date().toISOString();
}

function readI18n(value: unknown): Partial<Record<string, string>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Partial<Record<string, string>> = {};
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === "string" && text.trim()) out[key] = text.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function isIconKey(value: string): value is HomepageInfoIconKey {
  return (HOMEPAGE_INFO_ICON_KEYS as readonly string[]).includes(value);
}

export function defaultHomepageInfoContent(): HomepageInfoContent {
  const t = nowIso();
  return {
    whyTitle: "Why Choose Us",
    howTitle: "How it Works",
    blocks: [
      {
        id: "why-trust",
        section: "why",
        title: "Trust",
        body: "Verified partners, moderated fleets, and transparent airport delivery you can count on.",
        iconKey: "shield",
        sortOrder: 0,
        updatedAt: t,
      },
      {
        id: "why-price",
        section: "why",
        title: "Best Price",
        body: "Compare daily rates with TPL included free. Pay a small online deposit, balance on site.",
        iconKey: "tag",
        sortOrder: 1,
        updatedAt: t,
      },
      {
        id: "why-support",
        section: "why",
        title: "24/7 Support",
        body: "WhatsApp and messenger assistance around the clock for flight delays and custom requests.",
        iconKey: "clock",
        sortOrder: 2,
        updatedAt: t,
      },
      {
        id: "how-search",
        section: "how",
        title: "Search",
        body: "Choose airport, dates, and vehicle category.",
        iconKey: "search",
        sortOrder: 0,
        updatedAt: t,
      },
      {
        id: "how-book",
        section: "how",
        title: "Book",
        body: "Confirm with your flight number and a small deposit.",
        iconKey: "key",
        sortOrder: 1,
        updatedAt: t,
      },
      {
        id: "how-pickup",
        section: "how",
        title: "Pick Up",
        body: "Meet your car at arrivals, timed to your flight.",
        iconKey: "car",
        sortOrder: 2,
        updatedAt: t,
      },
      {
        id: "how-drive",
        section: "how",
        title: "Drive Away",
        body: "Pay the remaining balance on site and go.",
        iconKey: "navigation",
        sortOrder: 3,
        updatedAt: t,
      },
    ],
  };
}

function normalizeContent(raw: unknown): HomepageInfoContent {
  const defaults = defaultHomepageInfoContent();
  if (!raw || typeof raw !== "object") return defaults;
  const data = raw as Partial<HomepageInfoContent>;
  const blocksIn = Array.isArray(data.blocks) ? data.blocks : defaults.blocks;

  const blocks = blocksIn.map((row, index) => {
    const item = row as Partial<HomepageInfoBlock>;
    const section: HomepageInfoSection = item.section === "how" ? "how" : "why";
    const iconRaw = String(item.iconKey || "shield");
    return {
      id: String(item.id || `block-${index}`),
      section,
      title: String(item.title || "Title").trim() || "Title",
      body: String(item.body || "").trim(),
      titleI18n: readI18n(item.titleI18n),
      bodyI18n: readI18n(item.bodyI18n),
      iconKey: isIconKey(iconRaw) ? iconRaw : "shield",
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
      updatedAt: String(item.updatedAt || nowIso()),
    };
  });

  // Ensure we always have at least the default set if empty
  if (!blocks.length) return defaults;

  return {
    whyTitle: String(data.whyTitle || defaults.whyTitle).trim() || defaults.whyTitle,
    howTitle: String(data.howTitle || defaults.howTitle).trim() || defaults.howTitle,
    whyTitleI18n: readI18n(data.whyTitleI18n),
    howTitleI18n: readI18n(data.howTitleI18n),
    blocks: blocks.sort((a, b) => {
      if (a.section !== b.section) return a.section === "why" ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    }),
  };
}

async function writeStore(content: HomepageInfoContent) {
  cache.set(content);
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(content, null, 2), "utf8");
  } catch {
    /* Hosted filesystem is read-only. */
  }
}

export async function getHomepageInfoContent(): Promise<HomepageInfoContent> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const content = normalizeContent(JSON.parse(raw) as unknown);
    cache.set(content);
    return content;
  } catch {
    const defaults = defaultHomepageInfoContent();
    await writeStore(defaults);
    return defaults;
  }
}

function mergeLocaleField(
  canonical: string,
  map: Partial<Record<string, string>> | undefined,
  locale: string | undefined,
  nextValue: string | undefined,
): { canonical: string; map?: Partial<Record<string, string>> } {
  const value = nextValue?.trim();
  if (!value) return { canonical, map };
  if (!locale || locale === "en") return { canonical: value, map };
  return { canonical, map: { ...map, [locale]: value } };
}

export async function updateHomepageInfoHeadings(input: {
  whyTitle?: string;
  howTitle?: string;
  locale?: string;
}): Promise<HomepageInfoContent> {
  const current = await getHomepageInfoContent();
  const why = mergeLocaleField(current.whyTitle, current.whyTitleI18n, input.locale, input.whyTitle);
  const how = mergeLocaleField(current.howTitle, current.howTitleI18n, input.locale, input.howTitle);
  const next: HomepageInfoContent = {
    ...current,
    whyTitle: why.canonical,
    howTitle: how.canonical,
    whyTitleI18n: why.map,
    howTitleI18n: how.map,
  };
  await writeStore(next);
  return next;
}

export async function updateHomepageInfoBlock(
  id: string,
  input: { title?: string; body?: string; iconKey?: string; locale?: string },
): Promise<HomepageInfoBlock | null> {
  const current = await getHomepageInfoContent();
  const idx = current.blocks.findIndex((b) => b.id === id);
  if (idx < 0) return null;

  const prev = current.blocks[idx];
  const iconRaw = input.iconKey ?? prev.iconKey;
  const title = mergeLocaleField(prev.title, prev.titleI18n, input.locale, input.title);
  const body = mergeLocaleField(prev.body, prev.bodyI18n, input.locale, input.body ?? prev.body);
  const nextBlock: HomepageInfoBlock = {
    ...prev,
    title: input.title !== undefined ? title.canonical : prev.title,
    body: input.body !== undefined ? body.canonical : prev.body,
    titleI18n: input.title !== undefined ? title.map : prev.titleI18n,
    bodyI18n: input.body !== undefined ? body.map : prev.bodyI18n,
    iconKey: isIconKey(iconRaw) ? iconRaw : prev.iconKey,
    updatedAt: nowIso(),
  };
  current.blocks[idx] = nextBlock;
  await writeStore(current);
  return nextBlock;
}

export async function reorderHomepageInfoBlocks(
  section: HomepageInfoSection,
  orderedIds: string[],
): Promise<HomepageInfoContent> {
  const current = await getHomepageInfoContent();
  const sectionBlocks = current.blocks.filter((b) => b.section === section);
  const others = current.blocks.filter((b) => b.section !== section);
  const byId = new Map(sectionBlocks.map((b) => [b.id, b]));
  const reordered: HomepageInfoBlock[] = [];

  orderedIds.forEach((id, index) => {
    const row = byId.get(id);
    if (!row) return;
    reordered.push({ ...row, sortOrder: index, updatedAt: nowIso() });
    byId.delete(id);
  });
  // append any missing
  for (const leftover of byId.values()) {
    reordered.push({ ...leftover, sortOrder: reordered.length, updatedAt: nowIso() });
  }

  const next: HomepageInfoContent = {
    ...current,
    blocks: [...others, ...reordered].sort((a, b) => {
      if (a.section !== b.section) return a.section === "why" ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    }),
  };
  await writeStore(next);
  return next;
}

/** Create a new block in a section (admin optional). Caps: why≤6, how≤8. */
export async function createHomepageInfoBlock(input: {
  section: HomepageInfoSection;
  title: string;
  body?: string;
  iconKey?: string;
}): Promise<HomepageInfoBlock> {
  const current = await getHomepageInfoContent();
  const sectionBlocks = current.blocks.filter((b) => b.section === input.section);
  const max = input.section === "why" ? 6 : 8;
  if (sectionBlocks.length >= max) {
    throw new Error(`Maximum ${max} cards for this section`);
  }
  const iconRaw = input.iconKey || (input.section === "why" ? "shield" : "search");
  const block: HomepageInfoBlock = {
    id: randomUUID(),
    section: input.section,
    title: input.title.trim() || "New card",
    body: (input.body || "").trim(),
    iconKey: isIconKey(iconRaw) ? iconRaw : "shield",
    sortOrder: sectionBlocks.length,
    updatedAt: nowIso(),
  };
  current.blocks.push(block);
  await writeStore(current);
  return block;
}

export async function deleteHomepageInfoBlock(id: string): Promise<boolean> {
  const current = await getHomepageInfoContent();
  const nextBlocks = current.blocks.filter((b) => b.id !== id);
  if (nextBlocks.length === current.blocks.length) return false;
  // keep at least 1 per section
  const whyCount = nextBlocks.filter((b) => b.section === "why").length;
  const howCount = nextBlocks.filter((b) => b.section === "how").length;
  if (whyCount < 1 || howCount < 1) {
    throw new Error("At least one card is required in each section");
  }
  await writeStore({ ...current, blocks: nextBlocks });
  return true;
}
