import "server-only";

import { sendTelegramMessage } from "@/lib/telegram/bot";
import { listStoredAdminChatIds } from "@/lib/telegram/notify-chats";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";

/** Resolve admin Telegram chat IDs (settings + remembered /start ADMIN). */
export async function resolveAdminTelegramChatIds(): Promise<string[]> {
  const stored = await listStoredAdminChatIds();
  try {
    const settings = await getPlatformSettings();
    const fromSettings = settings.adminTelegramChatId.trim();
    if (fromSettings && !stored.includes(fromSettings)) stored.push(fromSettings);
  } catch {
    /* optional */
  }
  return stored;
}

/** Send text to all configured admin Telegram chats via the site bot. */
export async function notifyAdminTelegram(text: string): Promise<{ sent: number; chats: number }> {
  const chats = await resolveAdminTelegramChatIds();
  if (!chats.length) return { sent: 0, chats: 0 };
  let sent = 0;
  for (const chatId of chats) {
    const result = await sendTelegramMessage(chatId, text);
    if (result.ok) sent += 1;
  }
  return { sent, chats: chats.length };
}
