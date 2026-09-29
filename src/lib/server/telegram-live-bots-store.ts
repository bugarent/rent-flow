import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TelegramLiveBot, TelegramLiveBotsConfig } from "@/lib/catalog/telegram-live-bots";
import { createTtlCache } from "@/lib/server/ttl-cache";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "telegram-live-bots.json");
const cache = createTtlCache<TelegramLiveBotsConfig>(10_000);

function empty(): TelegramLiveBotsConfig {
  return { bots: [] };
}

function normalizeBot(raw: Partial<TelegramLiveBot>, index: number): TelegramLiveBot | null {
  const botToken = String(raw.botToken || "").trim();
  const chatId = String(raw.chatId || "").trim();
  if (!botToken && !chatId && !String(raw.label || "").trim()) return null;
  const now = new Date().toISOString();
  return {
    id: String(raw.id || `bot-${index}-${randomUUID().slice(0, 8)}`),
    label: String(raw.label || raw.botUsername || `Bot ${index + 1}`).trim() || `Bot ${index + 1}`,
    botUsername: String(raw.botUsername || "")
      .trim()
      .replace(/^@/, ""),
    botToken,
    chatId,
    active: Boolean(raw.active),
    createdAt: String(raw.createdAt || now),
    updatedAt: String(raw.updatedAt || now),
  };
}

function normalize(raw: Partial<TelegramLiveBotsConfig> | null | undefined): TelegramLiveBotsConfig {
  const bots = Array.isArray(raw?.bots)
    ? raw!.bots
        .map((b, i) => normalizeBot(b as Partial<TelegramLiveBot>, i))
        .filter((b): b is TelegramLiveBot => Boolean(b))
    : [];
  // Ensure at most one active
  let seenActive = false;
  for (const bot of bots) {
    if (bot.active && seenActive) bot.active = false;
    else if (bot.active) seenActive = true;
  }
  return { bots };
}

async function readFileStore(): Promise<TelegramLiveBotsConfig> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<TelegramLiveBotsConfig>);
  } catch {
    const next = empty();
    await writeFileStore(next);
    return next;
  }
}

async function writeFileStore(config: TelegramLiveBotsConfig) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
  cache.set(config);
}

export async function getTelegramLiveBotsConfig(): Promise<TelegramLiveBotsConfig> {
  const hit = cache.get();
  if (hit) return hit;
  const config = await readFileStore();
  cache.set(config);
  return config;
}

export async function saveTelegramLiveBotsConfig(
  input: TelegramLiveBotsConfig,
): Promise<TelegramLiveBotsConfig> {
  const next = normalize(input);
  const now = new Date().toISOString();
  next.bots = next.bots.map((b) => ({ ...b, updatedAt: now }));
  await writeFileStore(next);
  return next;
}

/** The bot marked active for live-chat operator notifications. */
export async function getActiveTelegramLiveBot(): Promise<TelegramLiveBot | null> {
  const { bots } = await getTelegramLiveBotsConfig();
  return bots.find((b) => b.active && b.botToken.trim() && b.chatId.trim()) ?? null;
}

/** Mask token for admin UI responses. */
export function maskBotToken(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${"•".repeat(Math.min(20, t.length - 4))}${t.slice(-4)}`;
}

export function botsForAdminUi(config: TelegramLiveBotsConfig) {
  return {
    bots: config.bots.map((b) => ({
      ...b,
      botToken: "",
      botTokenSet: Boolean(b.botToken.trim()),
      botTokenMasked: maskBotToken(b.botToken),
    })),
  };
}
