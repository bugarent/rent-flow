import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { join } from "node:path";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { createTtlCache } from "@/lib/server/ttl-cache";

/** Dedicated bot for live-chat operator handoff (separate from the booking bot). */
export type LiveChatTelegramBot = {
  label: string;
  botUsername: string;
  botToken: string;
  chatId: string;
  enabled: boolean;
  webhookOk: boolean;
  updatedAt: string;
};

const DATA_FILE = join(dataRoot(), "live-chat-telegram-bot.json");
const cache = createTtlCache<LiveChatTelegramBot>(10_000);

function empty(): LiveChatTelegramBot {
  return {
    label: "",
    botUsername: "",
    botToken: "",
    chatId: "",
    enabled: false,
    webhookOk: false,
    updatedAt: "",
  };
}

function normalize(raw: Partial<LiveChatTelegramBot> | null | undefined): LiveChatTelegramBot {
  const base = empty();
  if (!raw) return base;
  return {
    label: String(raw.label ?? "").trim().slice(0, 80),
    botUsername: String(raw.botUsername ?? "").trim().replace(/^@/, "").slice(0, 64),
    botToken: String(raw.botToken ?? "").trim(),
    chatId: String(raw.chatId ?? "").trim().slice(0, 64),
    enabled: Boolean(raw.enabled),
    webhookOk: Boolean(raw.webhookOk),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function getLiveChatTelegramBot(): Promise<LiveChatTelegramBot> {
  const hit = cache.get();
  if (hit) return hit;
  let value = empty();
  try {
    value = normalize(JSON.parse(await readFile(DATA_FILE, "utf8")) as Partial<LiveChatTelegramBot>);
  } catch {
    /* not configured yet */
  }
  cache.set(value);
  return value;
}

export async function saveLiveChatTelegramBot(
  input: Partial<LiveChatTelegramBot>,
): Promise<LiveChatTelegramBot> {
  const next = normalize({ ...input, updatedAt: new Date().toISOString() });
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
  cache.set(next);
  return next;
}

/** Enabled bot with token + chat id, or null (live chat then uses the admin bot). */
export async function getActiveLiveChatTelegramBot(): Promise<LiveChatTelegramBot | null> {
  const bot = await getLiveChatTelegramBot();
  return bot.enabled && bot.botToken && bot.chatId ? bot : null;
}

export function liveChatBotForAdminUi(bot: LiveChatTelegramBot) {
  const t = bot.botToken;
  return {
    label: bot.label,
    botUsername: bot.botUsername,
    chatId: bot.chatId,
    enabled: bot.enabled,
    webhookOk: bot.webhookOk,
    botTokenSet: Boolean(t),
    botTokenMasked: t ? `${"•".repeat(Math.min(20, Math.max(4, t.length - 4)))}${t.slice(-4)}` : "",
  };
}

export type LiveChatBotAdminView = ReturnType<typeof liveChatBotForAdminUi>;
