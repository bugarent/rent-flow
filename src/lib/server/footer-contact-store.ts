import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  emptyFooterContact,
  type FooterContactConfig,
} from "@/lib/catalog/footer-contact";
import { createTtlCache } from "@/lib/server/ttl-cache";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

export type { FooterContactConfig };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "footer-contact.json");
const cache = createTtlCache<FooterContactConfig>(20_000);

function normalize(parsed: Partial<FooterContactConfig>): FooterContactConfig {
  return {
    phone: String(parsed.phone || "").trim(),
    email: String(parsed.email || "").trim(),
    inboxEmail: String(parsed.inboxEmail || "").trim(),
    address: String(parsed.address || "").trim(),
    updatedAt: String(parsed.updatedAt || new Date().toISOString()),
  };
}

async function writeConfig(config: FooterContactConfig) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
  cache.set(config);
  revalidatePublishedContent();
}

export async function getFooterContactConfig(): Promise<FooterContactConfig> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const next = normalize(JSON.parse(raw) as Partial<FooterContactConfig>);
    cache.set(next);
    return next;
  } catch {
    return emptyFooterContact();
  }
}

export async function saveFooterContactConfig(input: {
  phone?: string;
  email?: string;
  inboxEmail?: string;
  address?: string;
}): Promise<FooterContactConfig> {
  const next: FooterContactConfig = {
    phone: String(input.phone || "").trim().slice(0, 80),
    email: String(input.email || "").trim().slice(0, 160),
    inboxEmail: String(input.inboxEmail || "").trim().slice(0, 160),
    address: String(input.address || "").trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

export async function getPublicFooterContact(): Promise<FooterContactConfig> {
  return getFooterContactConfig();
}
