import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  emptyLegalPageContent,
  emptyLegalPages,
  type LegalPageContent,
  type LegalPagesConfig,
} from "@/lib/catalog/legal-pages";

export type { LegalPageContent, LegalPagesConfig };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "legal-pages.json");

function normalizePage(raw: Partial<LegalPageContent> | null | undefined): LegalPageContent {
  const base = emptyLegalPageContent();
  if (!raw || typeof raw !== "object") return base;
  return {
    body: String(raw.body || "").trim(),
    fileUrl: String(raw.fileUrl || "").trim(),
    updatedAt: String(raw.updatedAt || base.updatedAt),
  };
}

function normalize(parsed: Partial<LegalPagesConfig> | null | undefined): LegalPagesConfig {
  const base = emptyLegalPages();
  if (!parsed || typeof parsed !== "object") return base;
  return {
    terms: normalizePage(parsed.terms),
    privacy: normalizePage(parsed.privacy),
  };
}

async function writeConfig(config: LegalPagesConfig) {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
  } catch {
    /* Hosted filesystem is read-only. */
  }
}

export async function getLegalPagesConfig(): Promise<LegalPagesConfig> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<LegalPagesConfig>);
  } catch {
    const empty = emptyLegalPages();
    await writeConfig(empty);
    return empty;
  }
}

export async function saveLegalPagesConfig(input: {
  terms?: Partial<LegalPageContent>;
  privacy?: Partial<LegalPageContent>;
}): Promise<LegalPagesConfig> {
  const current = await getLegalPagesConfig();
  const now = new Date().toISOString();
  const next: LegalPagesConfig = {
    terms: {
      body: String(input.terms?.body ?? current.terms.body).trim().slice(0, 100_000),
      fileUrl: String(input.terms?.fileUrl ?? current.terms.fileUrl).trim().slice(0, 2000),
      updatedAt: now,
    },
    privacy: {
      body: String(input.privacy?.body ?? current.privacy.body).trim().slice(0, 100_000),
      fileUrl: String(input.privacy?.fileUrl ?? current.privacy.fileUrl).trim().slice(0, 2000),
      updatedAt: now,
    },
  };
  await writeConfig(next);
  return next;
}

export async function getPublicLegalPages(): Promise<LegalPagesConfig> {
  return getLegalPagesConfig();
}
