import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTelegramBotToken, sendTelegramMessage } from "@/lib/telegram/bot";
import { extractStartPayload, markTelegramVerified } from "@/lib/telegram/verification-store";
import {
  consumePartnerTelegramBindPending,
  parsePartnerVerifyPayload,
} from "@/lib/telegram/partner-bind";
import { telegramBotCopy, resolveTelegramLocale } from "@/lib/telegram/locale-copy";
import { rememberAdminChat, rememberPartnerChat } from "@/lib/telegram/notify-chats";
import { savePlatformSettings } from "@/lib/server/platform-settings-store";
import { loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
    from?: { username?: string; first_name?: string };
  };
};

function webhookSecretOk(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  return got === expected;
}

async function bindPartnerDashboard(input: {
  partnerId: string;
  chatId: string | number;
  username?: string | null;
}) {
  const pending = await consumePartnerTelegramBindPending(input.partnerId);
  const locale = resolveTelegramLocale(pending?.locale);
  const local = loadLocalPartner();
  const localEmail =
    local && (local.id === input.partnerId || input.partnerId === "local-partner") ? local.email : "";
  await rememberPartnerChat({
    chatId: String(input.chatId),
    partnerId: input.partnerId,
    email: localEmail,
  });
  try {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) {
      if (localEmail) return { ok: true as const, locale };
      return { ok: false as const, reason: "UNKNOWN" as const, locale };
    }

    await rememberPartnerChat({
      chatId: String(input.chatId),
      partnerId: partner.id,
      email: partner.email,
    });
    await prisma.partner.update({
      where: { id: input.partnerId },
      data: {
        telegramChatId: String(input.chatId),
        telegramUsername: input.username?.replace(/^@/, "").toLowerCase() || partner.telegramUsername,
        telegramVerifiedAt: new Date(),
      },
    });
    return { ok: true as const, locale };
  } catch (error) {
    if (isDbOfflineError(error)) {
      return localEmail
        ? { ok: true as const, locale }
        : { ok: false as const, reason: "DB_OFFLINE" as const, locale };
    }
    throw error;
  }
}

export async function POST(req: Request) {
  if (!(await resolveTelegramBotToken())) {
    return NextResponse.json({ ok: false, error: "Bot token missing" }, { status: 503 });
  }
  if (!webhookSecretOk(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const text = message?.text?.trim() || "";
  const chatId = message?.chat?.id;
  if (!text || chatId == null) {
    return NextResponse.json({ ok: true });
  }

  const payload = extractStartPayload(text);
  if (payload && /^admin$/i.test(payload)) {
    const chat = String(chatId);
    await rememberAdminChat(chat);
    await savePlatformSettings({ adminTelegramChatId: chat });
    await sendTelegramMessage(
      chatId,
      "ადმინისტრატორის შეტყობინებები ჩაირთო. ახალი ჯავშანი და ცვლილება აქ მოგივათ.",
    );
    return NextResponse.json({ ok: true });
  }

  if (!payload) {
    // Live-chat operator commands (no /start payload)
    const lower = text.toLowerCase();
    if (lower === "/done" || lower === "/end" || lower.startsWith("/done ")) {
      const { findActiveOperatorSession, endOperatorSession } = await import(
        "@/lib/server/live-chat/operator-queue"
      );
      const active = await findActiveOperatorSession();
      if (!active) {
        await sendTelegramMessage(chatId, "No active live-chat session.");
        return NextResponse.json({ ok: true });
      }
      const result = await endOperatorSession(active.id);
      await sendTelegramMessage(
        chatId,
        result.promotedId
          ? `✅ Ended ${active.id.slice(0, 8)}… Next customer connected.`
          : `✅ Ended ${active.id.slice(0, 8)}… Queue empty.`,
      );
      return NextResponse.json({ ok: true });
    }

    if (!/^\/start/i.test(text)) {
      const { findActiveOperatorSession, appendOperatorReply } = await import(
        "@/lib/server/live-chat/operator-queue"
      );
      const active = await findActiveOperatorSession();
      if (active) {
        await appendOperatorReply(active.id, text);
        await sendTelegramMessage(chatId, "↩ Sent to customer.");
        return NextResponse.json({ ok: true });
      }
    }

    if (/^\/start/i.test(text)) {
      await sendTelegramMessage(chatId, telegramBotCopy("en").welcome);
    }
    return NextResponse.json({ ok: true });
  }

  const partnerId = parsePartnerVerifyPayload(payload);
  if (partnerId) {
    const bound = await bindPartnerDashboard({
      partnerId,
      chatId,
      username: message?.from?.username ?? null,
    });
    const copy = telegramBotCopy(bound.locale);
    if (bound.ok) {
      await sendTelegramMessage(chatId, copy.dashboardVerified);
    } else if (bound.reason === "NO_PENDING") {
      await sendTelegramMessage(chatId, copy.dashboardNeedButton);
    } else if (bound.reason === "DB_OFFLINE") {
      await sendTelegramMessage(chatId, copy.dashboardExpired);
    } else {
      await sendTelegramMessage(chatId, copy.dashboardUnknown);
    }
    return NextResponse.json({ ok: true });
  }

  const result = await markTelegramVerified({
    code: payload,
    chatId,
    fromUsername: message?.from?.username ?? null,
  });
  const copy = telegramBotCopy("en");

  if (result.ok) {
    await sendTelegramMessage(chatId, copy.registerVerified);
  } else if (result.reason === "EXPIRED") {
    await sendTelegramMessage(chatId, copy.registerExpired);
  } else if (result.reason === "UNKNOWN_CODE") {
    await sendTelegramMessage(chatId, copy.registerUnknown);
  } else if (result.reason === "CONSUMED") {
    await sendTelegramMessage(chatId, copy.registerConsumed);
  }

  return NextResponse.json({ ok: true });
}

/** Health / ping for webhook URL checks. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(await resolveTelegramBotToken()),
    path: "/api/telegram/webhook",
  });
}
