import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "telegram-verifications.json");
const TTL_MS = 30 * 60 * 1000;

export type TelegramVerifySession = {
  code: string;
  email: string;
  telegramUsername: string;
  chatId: string | null;
  verifiedAt: string | null;
  expiresAt: string;
  createdAt: string;
  consumedAt: string | null;
};

type StoreFile = { sessions: TelegramVerifySession[] };

function emptyStore(): StoreFile {
  return { sessions: [] };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function prune(sessions: TelegramVerifySession[], now = Date.now()) {
  return sessions.filter((s) => new Date(s.expiresAt).getTime() > now - 24 * 60 * 60 * 1000);
}

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Telegram start payload: letters, digits, underscore (max 64). */
export function createVerificationCode(): string {
  return `rac_${randomBytes(8).toString("hex")}`;
}

export function extractStartPayload(text: string): string | null {
  const trimmed = text.trim();
  const startMatch = trimmed.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  if (startMatch) {
    const payload = (startMatch[1] || "").trim();
    return payload || null;
  }
  const codeMatch = trimmed.match(/\b(rac_[a-f0-9]{16})\b/i);
  return codeMatch ? codeMatch[1] : null;
}

export async function createTelegramVerifySession(input: {
  email: string;
  telegramUsername: string;
}): Promise<TelegramVerifySession> {
  const email = normalizeEmail(input.email);
  const telegramUsername = normalizeUsername(input.telegramUsername);
  if (!email || !telegramUsername) {
    throw new Error("EMAIL_AND_USERNAME_REQUIRED");
  }

  const store = await readStore();
  const now = Date.now();
  store.sessions = prune(store.sessions, now).filter(
    (s) => !(s.email === email && !s.verifiedAt && !s.consumedAt),
  );

  const session: TelegramVerifySession = {
    code: createVerificationCode(),
    email,
    telegramUsername,
    chatId: null,
    verifiedAt: null,
    expiresAt: new Date(now + TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
    consumedAt: null,
  };
  store.sessions.push(session);
  await writeStore(store);
  return session;
}

export async function getTelegramVerifySession(code: string, email?: string): Promise<TelegramVerifySession | null> {
  const store = await readStore();
  const session = store.sessions.find((s) => s.code === code) ?? null;
  if (!session) return null;
  if (email && session.email !== normalizeEmail(email)) return null;
  return session;
}

export async function markTelegramVerified(input: {
  code: string;
  chatId: string | number;
  fromUsername?: string | null;
}): Promise<{ ok: true; session: TelegramVerifySession } | { ok: false; reason: string }> {
  const store = await readStore();
  const idx = store.sessions.findIndex((s) => s.code === input.code);
  if (idx < 0) return { ok: false, reason: "UNKNOWN_CODE" };

  const session = store.sessions[idx];
  const now = Date.now();
  if (new Date(session.expiresAt).getTime() < now) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (session.consumedAt) {
    return { ok: false, reason: "CONSUMED" };
  }

  const fromUser = input.fromUsername ? normalizeUsername(input.fromUsername) : "";
  if (fromUser && session.telegramUsername && fromUser !== session.telegramUsername) {
    // Soft mismatch: still accept — the one-time code is the binding.
    console.info(
      `[telegram] username mismatch session=${session.telegramUsername} from=${fromUser} (accepting code)`,
    );
  }

  const updated: TelegramVerifySession = {
    ...session,
    chatId: String(input.chatId),
    verifiedAt: new Date(now).toISOString(),
  };
  store.sessions[idx] = updated;
  await writeStore(store);
  return { ok: true, session: updated };
}

/** Consume a verified session for registration (one-time). */
export async function consumeTelegramVerification(input: {
  code: string;
  email: string;
}): Promise<
  | { ok: true; chatId: string; telegramUsername: string }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "NOT_VERIFIED" | "EMAIL_MISMATCH" | "CONSUMED" }
> {
  const store = await readStore();
  const idx = store.sessions.findIndex((s) => s.code === input.code);
  if (idx < 0) return { ok: false, reason: "NOT_FOUND" };

  const session = store.sessions[idx];
  if (session.email !== normalizeEmail(input.email)) {
    return { ok: false, reason: "EMAIL_MISMATCH" };
  }
  if (session.consumedAt) return { ok: false, reason: "CONSUMED" };
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (!session.verifiedAt || !session.chatId) {
    return { ok: false, reason: "NOT_VERIFIED" };
  }

  store.sessions[idx] = { ...session, consumedAt: new Date().toISOString() };
  await writeStore(store);
  return {
    ok: true,
    chatId: session.chatId,
    telegramUsername: session.telegramUsername,
  };
}
