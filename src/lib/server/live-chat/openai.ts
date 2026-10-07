import "server-only";

import type { LiveChatMessage } from "@/lib/server/live-chat/store";
import { buildLiveChatKnowledge } from "@/lib/server/live-chat/knowledge";
import { answerFromSiteKnowledge, type LiveChatAiResult } from "@/lib/server/live-chat/knowledge-answer";
import { isOperatorHours } from "@/lib/server/live-chat/operator-hours";
import { buildLiveChatSystemPrompt, LIVE_CHAT_TEMPERATURE } from "@/lib/server/live-chat/system-prompt";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import type { Locale } from "@/lib/i18n/config";

export type { LiveChatAiResult };

function greetingByLocale(locale: string): string {
  if (locale === "ka") {
    return "გამარჯობა! მე ვარ rentairportcars.com-ის ასისტენტი. როგორ შემიძლია დაგეხმაროთ აეროპორტის მანქანის გაქირავებაში?";
  }
  if (locale === "ru") {
    return "Здравствуйте! Я помощник rentairportcars.com. Чем могу помочь с арендой авто в аэропорту?";
  }
  return "Hello! I’m the rentairportcars.com assistant. How can I help with airport car rental today?";
}

export function liveChatGreeting(locale: string): string {
  return greetingByLocale(locale);
}

async function resolveOpenAiApiKey(): Promise<string | null> {
  try {
    const settings = await getPlatformSettings();
    const fromSettings = settings.openaiApiKey?.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* ignore */
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

const MAX_AI_REPLY_CHARS = 1800;

function capReply(reply: string): string {
  if (reply.length <= MAX_AI_REPLY_CHARS) return reply;
  const cut = reply.slice(0, MAX_AI_REPLY_CHARS - 20);
  const last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("\n"));
  return `${(last > 400 ? cut.slice(0, last + 1) : cut).trim()}…`;
}

function parseAiJson(raw: string): LiveChatAiResult {
  const trimmed = raw.trim();
  try {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
    const parsed = JSON.parse(json) as Partial<LiveChatAiResult>;
    const reply = capReply(String(parsed.reply || trimmed).trim() || "…");
    return {
      reply,
      exhausted: Boolean(parsed.exhausted),
      userWantsOperator: Boolean(parsed.userWantsOperator),
    };
  } catch {
    return { reply: capReply(trimmed) || "…", exhausted: false, userWantsOperator: false };
  }
}

function lastUserMessage(history: LiveChatMessage[]): string {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m?.role === "user" && m.content.trim()) return m.content.trim();
  }
  return "";
}

function assistantReplies(history: LiveChatMessage[]): string[] {
  return history.filter((m) => m.role === "assistant" && m.content.trim()).map((m) => m.content.trim());
}

function normalizeForCompare(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** True when the reply is (nearly) identical to an earlier assistant reply. */
export function isRepeatedReply(reply: string, previous: string[]): boolean {
  const n = normalizeForCompare(reply);
  if (!n) return false;
  return previous.some((p) => normalizeForCompare(p) === n);
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callOpenAi(apiKey: string, messages: ChatMessage[]): Promise<LiveChatAiResult | null> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: LIVE_CHAT_TEMPERATURE,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("[live-chat] OpenAI error", res.status, errText.slice(0, 300));
    return null;
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parseAiJson(data.choices?.[0]?.message?.content || "");
}

/** Call OpenAI when configured; otherwise answer from site knowledge. */
export async function runLiveChatAi(input: {
  locale: Locale | string;
  history: LiveChatMessage[];
}): Promise<LiveChatAiResult> {
  const userMessage = lastUserMessage(input.history);
  const previousReplies = assistantReplies(input.history);
  const fallback = () =>
    answerFromSiteKnowledge({ locale: input.locale, message: userMessage, previousReplies });
  const apiKey = await resolveOpenAiApiKey();

  if (!apiKey) return fallback();

  try {
    const knowledge = await buildLiveChatKnowledge(
      (input.locale === "ka" || input.locale === "ru" ? input.locale : "en") as Locale,
    );
    const system = buildLiveChatSystemPrompt({
      knowledge,
      withinOperatorHours: isOperatorHours(),
      previousReplies,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...input.history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-20)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const first = await callOpenAi(apiKey, messages);
    if (!first) return fallback();
    if (!isRepeatedReply(first.reply, previousReplies)) return first;

    const retry = await callOpenAi(apiKey, [
      ...messages,
      { role: "assistant", content: JSON.stringify(first) },
      {
        role: "system",
        content:
          "That reply repeats an earlier answer word for word. Re-read the user's latest message and answer its specific content with new, concrete information, or ask a precise clarifying question.",
      },
    ]);
    return retry && !isRepeatedReply(retry.reply, previousReplies) ? retry : first;
  } catch (error) {
    console.warn("[live-chat] OpenAI failed, using site knowledge", error);
    return fallback();
  }
}
