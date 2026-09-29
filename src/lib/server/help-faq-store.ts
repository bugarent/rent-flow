import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_HELP_FAQ, type HelpFaqConfig, type HelpFaqItem } from "@/lib/catalog/help-faq";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "help-faq.json");

function normalizeItem(raw: Partial<HelpFaqItem>, index: number): HelpFaqItem | null {
  const question = String(raw.question || "").trim();
  const answer = String(raw.answer || "").trim();
  if (!question || !answer) return null;
  return {
    id: String(raw.id || randomUUID()),
    question,
    answer,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
  };
}

async function writeConfig(config: HelpFaqConfig) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
}

export async function getHelpFaqConfig(): Promise<HelpFaqConfig> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<HelpFaqConfig>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item, i) => normalizeItem(item as Partial<HelpFaqItem>, i))
          .filter((item): item is HelpFaqItem => Boolean(item))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
    if (!items.length) {
      const seeded = { ...DEFAULT_HELP_FAQ, updatedAt: new Date().toISOString() };
      await writeConfig(seeded);
      return seeded;
    }
    return {
      items,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    const seeded = { ...DEFAULT_HELP_FAQ, updatedAt: new Date().toISOString() };
    await writeConfig(seeded);
    return seeded;
  }
}

export async function saveHelpFaqConfig(itemsInput: Array<Partial<HelpFaqItem>>): Promise<HelpFaqConfig> {
  const items = itemsInput
    .map((item, i) => normalizeItem(item, i))
    .filter((item): item is HelpFaqItem => Boolean(item))
    .map((item, i) => ({ ...item, sortOrder: i }));
  const next: HelpFaqConfig = {
    items,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

export async function getPublicHelpFaq(): Promise<HelpFaqItem[]> {
  const config = await getHelpFaqConfig();
  return config.items;
}
