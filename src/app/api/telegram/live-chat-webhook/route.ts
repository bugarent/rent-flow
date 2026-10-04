import { NextResponse } from "next/server";
import { getActiveLiveChatTelegramBot } from "@/lib/server/live-chat-telegram-bot-store";
import { sendTelegramMessageWithToken } from "@/lib/telegram/send-with-token";

type TelegramUpdate = {
  message?: { text?: string; chat?: { id?: number } };
};

function secretOk(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

/** Updates for the dedicated live-chat bot: operator replies and /done. */
export async function POST(req: Request) {
  if (!secretOk(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const bot = await getActiveLiveChatTelegramBot();
  if (!bot) return NextResponse.json({ ok: true });

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }
  const text = update.message?.text?.trim() || "";
  const chatId = update.message?.chat?.id;
  if (!text || chatId == null) return NextResponse.json({ ok: true });

  const reply = (message: string) => sendTelegramMessageWithToken(bot.botToken, chatId, message);

  if (String(chatId) !== bot.chatId) {
    if (/^\/start/i.test(text)) {
      await reply(`Chat ID: ${chatId}\nჩაწერეთ ეს ადმინში „ონლაინ ჩატის Telegram ბოტი“ → Chat ID.`);
    }
    return NextResponse.json({ ok: true });
  }

  const { findActiveOperatorSession, endOperatorSession, appendOperatorReply } = await import(
    "@/lib/server/live-chat/operator-queue"
  );
  const lower = text.toLowerCase();

  if (lower === "/done" || lower === "/end" || lower.startsWith("/done ")) {
    const active = await findActiveOperatorSession();
    if (!active) {
      await reply("No active live-chat session.");
      return NextResponse.json({ ok: true });
    }
    const result = await endOperatorSession(active.id);
    await reply(
      result.promotedId
        ? `✅ Ended ${active.id.slice(0, 8)}… Next customer connected.`
        : `✅ Ended ${active.id.slice(0, 8)}… Queue empty.`,
    );
    return NextResponse.json({ ok: true });
  }

  if (/^\/start/i.test(text)) {
    await reply("✅ Live chat bot connected. Customer messages will arrive here.");
    return NextResponse.json({ ok: true });
  }

  const active = await findActiveOperatorSession();
  if (active) {
    await appendOperatorReply(active.id, text);
    await reply("↩ Sent to customer.");
  } else {
    await reply("No active live-chat session.");
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "live-chat-webhook" });
}
