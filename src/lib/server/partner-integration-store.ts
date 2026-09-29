import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/server/data-paths";

type IntegrationRow = {
  partnerId: string;
  websiteToken: string;
  updatedAt: string;
};

type StoreFile = { rows: IntegrationRow[] };

async function storePath() {
  return resolveDataFile("partner", "partner-integration.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { rows: Array.isArray(parsed.rows) ? parsed.rows : [] };
  } catch {
    return { rows: [] };
  }
}

async function writeStore(data: StoreFile) {
  const path = await storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

export async function ensurePartnerWebsiteToken(partnerId: string) {
  const store = await readStore();
  const existing = store.rows.find((row) => row.partnerId === partnerId);
  if (existing) return existing.websiteToken;
  const websiteToken = randomBytes(24).toString("hex");
  store.rows.unshift({
    partnerId,
    websiteToken,
    updatedAt: new Date().toISOString(),
  });
  await writeStore(store);
  return websiteToken;
}

export async function getPartnerIdByWebsiteToken(token: string) {
  const key = token.trim();
  if (!key) return null;
  const { rows } = await readStore();
  return rows.find((row) => row.websiteToken === key)?.partnerId || null;
}
