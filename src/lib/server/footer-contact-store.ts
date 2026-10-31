import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, readFileForUpdate, withStoreLock, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  emptyFooterContact,
  normalizePaymentBadges,
  normalizeSocialLinks,
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
    paymentBadges: normalizePaymentBadges(parsed.paymentBadges),
    socialLinks: normalizeSocialLinks(parsed.socialLinks),
    updatedAt: String(parsed.updatedAt || new Date().toISOString()),
  };
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
    return cache.peek() ?? emptyFooterContact();
  }
}

/** Fields left out of `input` keep their saved value. */
export async function saveFooterContactConfig(input: {
  phone?: string;
  email?: string;
  inboxEmail?: string;
  address?: string;
  paymentBadges?: string[];
  socialLinks?: Record<string, string>;
}): Promise<FooterContactConfig> {
  return withStoreLock(DATA_FILE, async () => {
    const raw = await readFileForUpdate(DATA_FILE);
    const current = raw ? normalize(JSON.parse(raw) as Partial<FooterContactConfig>) : emptyFooterContact();
    const text = (value: string | undefined, fallback: string, max: number) =>
      value === undefined ? fallback : String(value).trim().slice(0, max);
    const next: FooterContactConfig = {
      ...current,
      phone: text(input.phone, current.phone, 80),
      email: text(input.email, current.email, 160),
      inboxEmail: text(input.inboxEmail, current.inboxEmail, 160),
      address: text(input.address, current.address, 200),
      paymentBadges:
        input.paymentBadges === undefined ? current.paymentBadges : normalizePaymentBadges(input.paymentBadges),
      socialLinks:
        input.socialLinks === undefined ? current.socialLinks : normalizeSocialLinks(input.socialLinks),
      updatedAt: new Date().toISOString(),
    };
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
    cache.set(next);
    revalidatePublishedContent();
    return next;
  });
}

export async function getPublicFooterContact(): Promise<FooterContactConfig> {
  const config = await getFooterContactConfig();
  // The inbox address is for the contact form only; the browser never needs it.
  return { ...config, inboxEmail: "" };
}
