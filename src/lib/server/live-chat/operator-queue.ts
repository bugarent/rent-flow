import "server-only";

import {
  appendLiveChatMessages,
  createLiveChatMessage,
  getLiveChatSession,
  listLiveChatSessions,
  patchLiveChatSession,
  type LiveChatSession,
  type OperatorMode,
} from "@/lib/server/live-chat/store";
import { getActiveTelegramLiveBot } from "@/lib/server/telegram-live-bots-store";
import { sendTelegramMessageWithToken } from "@/lib/telegram/send-with-token";
import { notifyAdminTelegram } from "@/lib/telegram/notify-admin";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import { resolveTelegramBotToken } from "@/lib/telegram/bot";

export type OperatorQueueResult = {
  mode: OperatorMode;
  position: number;
  notified: boolean;
  messages: LiveChatSession["messages"];
};

function queuePositionLabel(locale: string, position: number): string {
  if (locale === "ka") {
    if (position <= 1) return "თქვენ პირველი ხართ რიგში — ოპერატორი მალე დაგიკავშირდებათ.";
    return `თქვენ რიგში ხართ: ${position}-ე. დაელოდეთ, სანამ წინა საუბარი დასრულდება. ამ დროს ოპერატორთან კომუნიკაცია არ დაიწყება.`;
  }
  if (locale === "ru") {
    if (position <= 1) return "Вы первые в очереди — оператор скоро подключится.";
    return `Вы в очереди: ${position}-й. Дождитесь окончания предыдущего разговора. Связь с оператором пока не начнётся.`;
  }
  if (position <= 1) return "You are first in line — an operator will connect shortly.";
  return `You are #${position} in the queue. Please wait until the previous conversation ends. Operator chat will not start yet.`;
}

function activeConfirm(locale: string): string {
  if (locale === "ka") {
    return "დაკავშირებული ხართ ოპერატორთან. დაწერეთ შეტყობინება — ის გადაეცემა Telegram-ზე. დასრულებისას ოპერატორი დახურავს საუბარს.";
  }
  if (locale === "ru") {
    return "Вы на связи с оператором. Пишите сообщения — они уходят в Telegram. Когда разговор закончится, оператор закроет чат.";
  }
  return "You are connected to an operator. Your messages go to Telegram. The operator will end the chat when finished.";
}

async function notifyLiveChatTelegram(text: string): Promise<boolean> {
  const active = await getActiveTelegramLiveBot();
  if (active?.botToken && active.chatId) {
    const sent = await sendTelegramMessageWithToken(active.botToken, active.chatId, text);
    if (sent.ok) return true;
  }

  // Fallback: platform bot + admin chat ids
  const { sent } = await notifyAdminTelegram(text);
  if (sent > 0) return true;

  const settings = await getPlatformSettings();
  const token = (await resolveTelegramBotToken()) || "";
  const chatId = settings.adminTelegramChatId.trim();
  if (token && chatId) {
    const r = await sendTelegramMessageWithToken(token, chatId, text);
    return r.ok;
  }
  return false;
}

function buildHandoffText(session: LiveChatSession): string {
  const transcript = session.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
    .map((m) => `${m.role === "user" ? "Customer" : "AI"}: ${m.content}`)
    .join("\n");
  return [
    "🟢 Live chat — operator ACTIVE",
    `Session: ${session.id}`,
    `Locale: ${session.locale}`,
    "",
    "Reply in Telegram to talk to the customer.",
    "Send /done to finish this chat and serve the next person in queue.",
    "",
    "Transcript:",
    transcript.slice(0, 3200),
  ].join("\n");
}

/** Sessions waiting or talking to operator, oldest first. */
export async function listOperatorLine(): Promise<LiveChatSession[]> {
  const sessions = await listLiveChatSessions();
  return sessions
    .filter((s) => s.operatorMode === "queued" || s.operatorMode === "active")
    .sort((a, b) => {
      const ta = a.queueJoinedAt || a.operatorRequestedAt || a.createdAt;
      const tb = b.queueJoinedAt || b.operatorRequestedAt || b.createdAt;
      return ta.localeCompare(tb);
    });
}

export async function getQueuePosition(sessionId: string): Promise<number> {
  const line = await listOperatorLine();
  const idx = line.findIndex((s) => s.id === sessionId);
  return idx >= 0 ? idx + 1 : 0;
}

export async function enqueueOperatorRequest(sessionId: string): Promise<OperatorQueueResult> {
  const session = await getLiveChatSession(sessionId);
  if (!session) throw new Error("Session not found");

  if (session.operatorMode === "active") {
    return {
      mode: "active",
      position: 1,
      notified: session.operatorNotified,
      messages: session.messages,
    };
  }

  if (session.operatorMode === "queued") {
    const position = await getQueuePosition(sessionId);
    return {
      mode: "queued",
      position,
      notified: false,
      messages: session.messages,
    };
  }

  const line = await listOperatorLine();
  const hasActive = line.some((s) => s.operatorMode === "active");
  const now = new Date().toISOString();

  if (!hasActive && line.length === 0) {
    // Become active immediately
    const notified = await notifyLiveChatTelegram(buildHandoffText(session));
    const next = await appendLiveChatMessages(
      sessionId,
      [createLiveChatMessage("assistant", activeConfirm(session.locale))],
      {
        operatorMode: "active",
        queueJoinedAt: now,
        operatorRequestedAt: now,
        operatorNotified: notified,
        userRequestedOperator: true,
      },
    );
    return {
      mode: "active",
      position: 1,
      notified,
      messages: next?.messages ?? session.messages,
    };
  }

  // Join queue
  const position = line.length + 1;
  const next = await appendLiveChatMessages(
    sessionId,
    [createLiveChatMessage("assistant", queuePositionLabel(session.locale, position))],
    {
      operatorMode: "queued",
      queueJoinedAt: now,
      operatorRequestedAt: now,
      operatorNotified: false,
      userRequestedOperator: true,
    },
  );
  return {
    mode: "queued",
    position,
    notified: false,
    messages: next?.messages ?? session.messages,
  };
}

/** Forward a customer message to the active live-chat Telegram bot. */
export async function forwardOperatorCustomerMessage(
  session: LiveChatSession,
  text: string,
): Promise<boolean> {
  const body = [
    "💬 Customer message",
    `Session: ${session.id}`,
    "",
    text.slice(0, 3500),
    "",
    "Reply here to answer. /done — end chat & next in queue.",
  ].join("\n");
  return notifyLiveChatTelegram(body);
}

/** End active (or queued) session and promote the next waiter. */
export async function endOperatorSession(sessionId: string): Promise<{
  ended: boolean;
  promotedId: string | null;
}> {
  const session = await getLiveChatSession(sessionId);
  if (!session) return { ended: false, promotedId: null };
  if (session.operatorMode !== "active" && session.operatorMode !== "queued") {
    return { ended: false, promotedId: null };
  }

  const wasActive = session.operatorMode === "active";
  const bye =
    session.locale === "ka"
      ? "ოპერატორთან საუბარი დასრულდა. თუ კიდევ გაქვთ კითხვა — დაწერეთ აქ (AI) ან მოგვწერეთ მოგვიანებით."
      : "The operator chat has ended. You can keep asking here (AI) or contact us later.";

  await appendLiveChatMessages(sessionId, [createLiveChatMessage("assistant", bye)], {
    operatorMode: "ended",
  });

  if (!wasActive) return { ended: true, promotedId: null };

  const line = await listOperatorLine();
  const next = line.find((s) => s.operatorMode === "queued");
  if (!next) {
    await notifyLiveChatTelegram("✅ Live chat ended. Queue is empty.");
    return { ended: true, promotedId: null };
  }

  const notified = await notifyLiveChatTelegram(buildHandoffText(next));
  await appendLiveChatMessages(
    next.id,
    [createLiveChatMessage("assistant", activeConfirm(next.locale))],
    {
      operatorMode: "active",
      operatorNotified: notified,
    },
  );

  // Refresh queue position messages for remaining waiters
  const after = await listOperatorLine();
  for (let i = 0; i < after.length; i += 1) {
    const s = after[i]!;
    if (s.operatorMode !== "queued") continue;
    await appendLiveChatMessages(
      s.id,
      [createLiveChatMessage("assistant", queuePositionLabel(s.locale, i + 1))],
    );
  }

  return { ended: true, promotedId: next.id };
}

export async function findActiveOperatorSession(): Promise<LiveChatSession | null> {
  const line = await listOperatorLine();
  return line.find((s) => s.operatorMode === "active") ?? null;
}

export async function appendOperatorReply(
  sessionId: string,
  text: string,
): Promise<LiveChatSession | null> {
  return appendLiveChatMessages(sessionId, [
    createLiveChatMessage("assistant", text.trim()),
  ]);
}

/** Keep patch helper available for rare updates without messages. */
export async function setOperatorMode(sessionId: string, mode: OperatorMode) {
  return patchLiveChatSession(sessionId, { operatorMode: mode });
}
