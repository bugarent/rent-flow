import "server-only";

import { getPlatformSettings } from "@/lib/server/platform-settings-store";

const API = "https://api.telegram.org";

/** Resolve bot token: platform settings, then env, then the saved booking bot. */
export async function resolveTelegramBotToken(): Promise<string | null> {
  try {
    const settings = await getPlatformSettings();
    const fromSettings = settings.telegramBotToken.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* ignore */
  }
  const fromEnv = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    const { getActiveTelegramLiveBot } = await import("@/lib/server/telegram-live-bots-store");
    const saved = (await getActiveTelegramLiveBot())?.botToken.trim();
    if (saved) return saved;
  } catch {
    /* booking bot is optional */
  }
  return null;
}

export function telegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export async function resolveTelegramBotUsername(): Promise<string> {
  try {
    const settings = await getPlatformSettings();
    const fromSettings = settings.telegramBotUsername.trim().replace(/^@/, "");
    if (fromSettings) return fromSettings;
  } catch {
    /* ignore */
  }
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim() || "rentairportcarsbot";
  return raw.replace(/^@/, "");
}

export function telegramBotUsername(): string {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim() || "rentairportcarsbot";
  return raw.replace(/^@/, "");
}

export function telegramBotDeepLink(startPayload?: string, username?: string): string {
  const user = (username || telegramBotUsername()).replace(/^@/, "");
  if (startPayload) {
    return `https://t.me/${user}?start=${encodeURIComponent(startPayload)}`;
  }
  return `https://t.me/${user}`;
}

/** Public HTTPS origin. Ignores an http://localhost NEXTAUTH_URL. */
export function telegramPublicOrigin(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";
  if (configured.startsWith("https://")) return configured;
  const host = (req?.headers.get("x-forwarded-host") || req?.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (host && !/localhost|127\.0\.0\.1/i.test(host)) return `https://${host}`;
  return "https://rentairportcars.com";
}

/** Point Telegram updates at this site so /start can verify the partner. */
export async function ensureTelegramWebhook(req?: Request): Promise<{ ok: boolean; error?: string }> {
  const token = await resolveTelegramBotToken();
  if (!token) return { ok: false, error: "Bot token is not saved" };
  const webhookUrl = `${telegramPublicOrigin(req)}/api/telegram/webhook`;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const result = await setTelegramWebhook(webhookUrl, secretToken);
  if (!result.ok) {
    const description = result.description || "";
    const error = /unauthorized/i.test(description)
      ? "შენახული ბოტის ტოკენი Telegram-მა არ მიიღო. ადმინში ჩაწერეთ BotFather-ის ტოკენი თავიდან და შეინახეთ."
      : description || "Could not connect the bot";
    return { ok: false, error };
  }
  return { ok: true };
}

export async function telegramTokenIsValid(token: string): Promise<boolean> {
  const t = token.trim();
  if (!t) return false;
  try {
    const res = await fetch(`${API}/bot${t}/getMe`);
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

type TelegramApiResult = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

async function telegramCall(method: string, body: Record<string, unknown>): Promise<TelegramApiResult> {
  const token = await resolveTelegramBotToken();
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not configured" };
  }
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({
    ok: false,
    description: `Telegram HTTP ${res.status}`,
  }))) as TelegramApiResult;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { parseMode?: "HTML" | "Markdown" },
): Promise<{ ok: boolean; error?: string }> {
  const result = await telegramCall("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
  });
  if (!result.ok) {
    console.warn("[telegram] sendMessage failed:", result.description);
    return { ok: false, error: result.description || "sendMessage failed" };
  }
  return { ok: true };
}

export async function setTelegramWebhook(url: string, secretToken?: string): Promise<TelegramApiResult> {
  return telegramCall("setWebhook", {
    url,
    allowed_updates: ["message"],
    drop_pending_updates: false,
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}

/** Mask token for admin UI (show last 4 chars only). */
export function maskTelegramToken(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${"•".repeat(Math.min(24, t.length - 4))}${t.slice(-4)}`;
}
