import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/server/data-paths";
import { normalizeLogin } from "@/lib/crypto";

export type PartnerApiOwner = {
  partnerId: string;
  userId: string;
  email: string;
};

type PartnerApiRow = PartnerApiOwner & {
  /** sha256 of the full key — the key itself is shown once and never stored. */
  keyHash: string | null;
  keyPrefix: string | null;
  keyCreatedAt: string | null;
  lastUsedAt: string | null;
  webhookUrl: string;
  webhookSecret: string;
  updatedAt: string;
};

export type PartnerApiSettings = {
  hasKey: boolean;
  keyPreview: string | null;
  keyCreatedAt: string | null;
  lastUsedAt: string | null;
  webhookUrl: string;
  webhookSecret: string;
};

type StoreFile = { rows: PartnerApiRow[] };

const KEY_PREFIX = "rac_live_";
const LAST_USED_WRITE_MS = 60_000;

async function storePath() {
  return resolveDataFile("partner", "partner-api-keys.json");
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

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function toSettings(row: PartnerApiRow | undefined): PartnerApiSettings {
  return {
    hasKey: Boolean(row?.keyHash),
    keyPreview: row?.keyPrefix ? `${row.keyPrefix}${"•".repeat(16)}` : null,
    keyCreatedAt: row?.keyCreatedAt || null,
    lastUsedAt: row?.lastUsedAt || null,
    webhookUrl: row?.webhookUrl || "",
    webhookSecret: row?.webhookSecret || "",
  };
}

function ensureRow(store: StoreFile, owner: PartnerApiOwner): PartnerApiRow {
  let row = store.rows.find((r) => r.partnerId === owner.partnerId);
  if (!row) {
    row = {
      ...owner,
      keyHash: null,
      keyPrefix: null,
      keyCreatedAt: null,
      lastUsedAt: null,
      webhookUrl: "",
      webhookSecret: `whsec_${randomBytes(24).toString("hex")}`,
      updatedAt: new Date().toISOString(),
    };
    store.rows.push(row);
  }
  row.userId = owner.userId || row.userId;
  row.email = normalizeLogin(owner.email || row.email || "");
  return row;
}

export async function getPartnerApiSettings(owner: PartnerApiOwner): Promise<PartnerApiSettings> {
  const store = await readStore();
  const existing = store.rows.find((r) => r.partnerId === owner.partnerId);
  if (existing) return toSettings(existing);
  const row = ensureRow(store, owner);
  await writeStore(store);
  return toSettings(row);
}

/** Issues a new key and revokes the previous one. Returns the plain key once. */
export async function rotatePartnerApiKey(owner: PartnerApiOwner) {
  const store = await readStore();
  const row = ensureRow(store, owner);
  const key = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  const now = new Date().toISOString();
  row.keyHash = hashKey(key);
  row.keyPrefix = key.slice(0, KEY_PREFIX.length + 6);
  row.keyCreatedAt = now;
  row.lastUsedAt = null;
  row.updatedAt = now;
  await writeStore(store);
  return { key, settings: toSettings(row) };
}

export async function savePartnerWebhookUrl(owner: PartnerApiOwner, webhookUrl: string) {
  const store = await readStore();
  const row = ensureRow(store, owner);
  row.webhookUrl = webhookUrl.trim();
  row.updatedAt = new Date().toISOString();
  await writeStore(store);
  return toSettings(row);
}

export async function findPartnerByApiKey(raw: string): Promise<PartnerApiOwner | null> {
  const key = raw.trim();
  if (!key.startsWith(KEY_PREFIX) || key.length > 200) return null;
  const digest = Buffer.from(hashKey(key), "hex");
  const store = await readStore();
  const row = store.rows.find((r) => {
    if (!r.keyHash) return false;
    const stored = Buffer.from(r.keyHash, "hex");
    return stored.length === digest.length && timingSafeEqual(stored, digest);
  });
  if (!row) return null;
  const last = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0;
  if (Date.now() - last > LAST_USED_WRITE_MS) {
    row.lastUsedAt = new Date().toISOString();
    await writeStore(store).catch(() => undefined);
  }
  return { partnerId: row.partnerId, userId: row.userId, email: row.email };
}

function bareId(id: string) {
  return id.replace(/^file-partner-/, "");
}

/** Webhook target for the partner that owns a car (DB partner id, file partner id, user or email). */
export async function findWebhookForCarOwner(input: {
  partnerId?: string | null;
  partnerUserId?: string | null;
  partnerEmail?: string | null;
}): Promise<{ url: string; secret: string } | null> {
  const partnerId = bareId(String(input.partnerId || ""));
  const userId = String(input.partnerUserId || "");
  const email = normalizeLogin(input.partnerEmail || "");
  const { rows } = await readStore();
  const row = rows.find((r) => {
    if (!r.webhookUrl) return false;
    if (partnerId && bareId(r.partnerId) === partnerId) return true;
    if (userId && (r.userId === userId || bareId(r.partnerId) === userId)) return true;
    return Boolean(email && r.email && normalizeLogin(r.email) === email);
  });
  return row ? { url: row.webhookUrl, secret: row.webhookSecret } : null;
}
