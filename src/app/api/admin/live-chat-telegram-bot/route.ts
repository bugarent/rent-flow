import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { telegramPublicOrigin, telegramTokenIsValid } from "@/lib/telegram/bot";
import {
  getLiveChatTelegramBot,
  liveChatBotForAdminUi,
  saveLiveChatTelegramBot,
} from "@/lib/server/live-chat-telegram-bot-store";

const schema = z.object({
  label: z.string().trim().max(80).optional().default(""),
  botUsername: z.string().trim().max(64).optional().default(""),
  botToken: z.string().trim().max(200).optional().default(""),
  chatId: z.string().trim().max(64).optional().default(""),
  enabled: z.boolean(),
});

async function requireAdmin() {
  const session = await getAdminSession();
  return Boolean(session && session.user.role === "ADMIN");
}

async function connectWebhook(token: string, req: Request): Promise<{ ok: boolean; error?: string }> {
  const url = `${telegramPublicOrigin(req)}/api/telegram/live-chat-webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        allowed_updates: ["message"],
        ...(secret ? { secret_token: secret } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description || "setWebhook failed" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "setWebhook failed" };
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return NextResponse.json(liveChatBotForAdminUi(await getLiveChatTelegramBot()));
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const body = schema.parse(await req.json());
    const current = await getLiveChatTelegramBot();
    const token = body.botToken || current.botToken;
    const tokenChanged = Boolean(body.botToken) && body.botToken !== current.botToken;

    if (body.enabled && (!token || !body.chatId)) {
      return NextResponse.json(
        { error: "ჩართვისთვის საჭიროა ბოტის ტოკენი და Chat ID" },
        { status: 400 },
      );
    }
    if (token && (tokenChanged || body.enabled) && !(await telegramTokenIsValid(token))) {
      return NextResponse.json(
        { error: "ბოტის ტოკენი Telegram-მა არ მიიღო. ჩაწერეთ BotFather-ის ტოკენი თავიდან." },
        { status: 400 },
      );
    }

    let webhookOk = current.webhookOk && !tokenChanged;
    let webhookError: string | undefined;
    if (body.enabled && token) {
      const hook = await connectWebhook(token, req);
      webhookOk = hook.ok;
      webhookError = hook.error;
    }

    const saved = await saveLiveChatTelegramBot({
      label: body.label,
      botUsername: body.botUsername,
      botToken: token,
      chatId: body.chatId,
      enabled: body.enabled,
      webhookOk,
    });
    return NextResponse.json({ ...liveChatBotForAdminUi(saved), webhookError });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[admin/live-chat-telegram-bot PUT]", error);
    return NextResponse.json({ error: "Could not save bot" }, { status: 500 });
  }
}
