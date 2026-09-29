import { NextResponse } from "next/server";
import { setTelegramWebhook, telegramBotToken } from "@/lib/telegram/bot";

/**
 * Registers the Telegram webhook with Telegram.
 * Protect with SETUP_SECRET query/header in production, or call only from trusted env.
 * Example: POST /api/telegram/setup-webhook?secret=...
 */
export async function POST(req: Request) {
  const token = telegramBotToken();
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 503 });
  }

  const setupSecret = process.env.TELEGRAM_SETUP_SECRET?.trim();
  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret") ||
    req.headers.get("x-setup-secret") ||
    "";
  if (setupSecret && provided !== setupSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "";
  if (!site.startsWith("https://")) {
    return NextResponse.json(
      {
        error:
          "Webhook requires a public HTTPS base URL (set NEXT_PUBLIC_SITE_URL or NEXTAUTH_URL).",
      },
      { status: 400 },
    );
  }

  const webhookUrl = `${site}/api/telegram/webhook`;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const result = await setTelegramWebhook(webhookUrl, secretToken);
  return NextResponse.json({ webhookUrl, result }, { status: result.ok ? 200 : 502 });
}
