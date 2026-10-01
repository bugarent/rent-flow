import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import type { Locale } from "@/lib/i18n/config";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "telegram-partner-binds.json");
const TTL_MS = 45 * 60 * 1000;

export type PartnerTelegramBindPending = {
  partnerId: string;
  locale: Locale;
  expiresAt: string;
  createdAt: string;
};

type StoreFile = { pending: PartnerTelegramBindPending[] };

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { pending: Array.isArray(parsed.pending) ? parsed.pending : [] };
  } catch {
    return { pending: [] };
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function prune(pending: PartnerTelegramBindPending[], now = Date.now()) {
  return pending.filter((p) => new Date(p.expiresAt).getTime() > now);
}

/** Payload format requested: VERIFY_<partner_id> */
export function partnerVerifyStartPayload(partnerId: string): string {
  return `VERIFY_${partnerId}`;
}

export function parsePartnerVerifyPayload(payload: string): string | null {
  const m = payload.trim().match(/^VERIFY_([a-z0-9_-]+)$/i);
  return m?.[1] || null;
}

export async function createPartnerTelegramBindPending(input: {
  partnerId: string;
  locale?: string | null;
}): Promise<PartnerTelegramBindPending> {
  const store = await readStore();
  const now = Date.now();
  const locale: Locale = isLocale(input.locale) ? input.locale : DEFAULT_LOCALE;
  store.pending = prune(store.pending, now).filter((p) => p.partnerId !== input.partnerId);
  const row: PartnerTelegramBindPending = {
    partnerId: input.partnerId,
    locale,
    expiresAt: new Date(now + TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
  };
  store.pending.push(row);
  await writeStore(store);
  return row;
}

export async function consumePartnerTelegramBindPending(
  partnerId: string,
): Promise<PartnerTelegramBindPending | null> {
  const store = await readStore();
  const now = Date.now();
  store.pending = prune(store.pending, now);
  const idx = store.pending.findIndex((p) => p.partnerId === partnerId);
  if (idx < 0) return null;
  const row = store.pending[idx];
  store.pending.splice(idx, 1);
  await writeStore(store);
  return row;
}

export async function peekPartnerTelegramBindPending(
  partnerId: string,
): Promise<PartnerTelegramBindPending | null> {
  const store = await readStore();
  const pending = prune(store.pending);
  if (pending.length !== store.pending.length) await writeStore({ pending });
  return pending.find((p) => p.partnerId === partnerId) ?? null;
}
