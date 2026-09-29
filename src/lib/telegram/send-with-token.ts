import "server-only";

const API = "https://api.telegram.org";

/** Send with an explicit bot token (live-chat active bot). */
export async function sendTelegramMessageWithToken(
  token: string,
  chatId: string | number,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Bot token missing" };
  try {
    const res = await fetch(`${API}/bot${t}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: data.description || `Telegram HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "send failed" };
  }
}
