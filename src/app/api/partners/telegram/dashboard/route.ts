import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { ensureTelegramWebhook, resolveTelegramBotUsername, telegramBotDeepLink } from "@/lib/telegram/bot";
import {
  createPartnerTelegramBindPending,
  partnerVerifyStartPayload,
} from "@/lib/telegram/partner-bind";

const bodySchema = z.object({
  locale: z.string().optional(),
});

async function loadPartnerTelegram(userId: string) {
  try {
    return await prisma.partner.findUnique({
      where: { userId },
      select: {
        id: true,
        telegramChatId: true,
        telegramUsername: true,
        telegramVerifiedAt: true,
      },
    });
  } catch {
    return null;
  }
}

/** Authenticated partner: start dashboard Telegram bind → VERIFY_<partnerId> deep link. */
export async function POST(req: Request) {
  const session = await requirePartnerApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = await loadPartnerTelegram(session.user.id);
  if (!partner) {
    // Still allow opening the public bot when DB is offline / profile missing
    return NextResponse.json({
      verified: false,
      botUrl: telegramBotDeepLink(),
      error: "Partner profile not found or database offline",
    });
  }

  if (partner.telegramChatId && partner.telegramVerifiedAt) {
    return NextResponse.json({
      verified: true,
      botUrl: telegramBotDeepLink(),
    });
  }

  let locale: string | undefined;
  try {
    const json = bodySchema.parse(await req.json().catch(() => ({})));
    locale = json.locale;
  } catch {
    locale = undefined;
  }

  const dbLocales = ["en", "ka", "ru", "fr", "de", "pl", "ar"] as const;
  const dbLocale = dbLocales.find((code) => code === locale);
  if (dbLocale) {
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { locale: dbLocale },
      });
    } catch {
      /* locale column / offline — ignore */
    }
  }

  await createPartnerTelegramBindPending({ partnerId: partner.id, locale });
  const start = partnerVerifyStartPayload(partner.id);
  const username = await resolveTelegramBotUsername();
  const webhook = await ensureTelegramWebhook(req);
  if (!webhook.ok) {
    return NextResponse.json(
      { error: webhook.error || "Could not connect the Telegram bot", verified: false },
      { status: 503 },
    );
  }
  return NextResponse.json({
    verified: false,
    partnerId: partner.id,
    startPayload: start,
    botUrl: telegramBotDeepLink(start, username),
    expiresInMinutes: 45,
  });
}

export async function GET() {
  const session = await requirePartnerApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = await loadPartnerTelegram(session.user.id);
  if (!partner) {
    return NextResponse.json({
      verified: false,
      botUrl: telegramBotDeepLink(),
      telegramUsername: null,
      telegramVerifiedAt: null,
    });
  }

  const verified = Boolean(partner.telegramChatId && partner.telegramVerifiedAt);
  return NextResponse.json({
    verified,
    partnerId: partner.id,
    telegramUsername: partner.telegramUsername,
    telegramVerifiedAt: partner.telegramVerifiedAt,
    botUrl: telegramBotDeepLink(),
  });
}
