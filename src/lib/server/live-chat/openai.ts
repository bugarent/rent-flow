import "server-only";

import type { LiveChatMessage } from "@/lib/server/live-chat/store";
import { buildLiveChatKnowledge } from "@/lib/server/live-chat/knowledge";
import { answerFromSiteKnowledge, type LiveChatAiResult } from "@/lib/server/live-chat/knowledge-answer";
import { isOperatorHours, operatorHoursLabel } from "@/lib/server/live-chat/operator-hours";
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

function parseAiJson(raw: string): LiveChatAiResult {
  const trimmed = raw.trim();
  try {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
    const parsed = JSON.parse(json) as Partial<LiveChatAiResult>;
    let reply = String(parsed.reply || trimmed).trim() || "…";
    // Soft-cap overly long model replies for chat UX
    if (reply.length > 420) {
      const cut = reply.slice(0, 400);
      const last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf(" "));
      reply = `${(last > 120 ? cut.slice(0, last + 1) : cut).trim()}…`;
    }
    return {
      reply,
      exhausted: Boolean(parsed.exhausted),
      userWantsOperator: Boolean(parsed.userWantsOperator),
    };
  } catch {
    return { reply: trimmed.slice(0, 420) || "…", exhausted: false, userWantsOperator: false };
  }
}

function lastUserMessage(history: LiveChatMessage[]): string {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m?.role === "user" && m.content.trim()) return m.content.trim();
  }
  return "";
}

/** Call OpenAI when configured; otherwise answer from site knowledge. */
export async function runLiveChatAi(input: {
  locale: Locale | string;
  history: LiveChatMessage[];
}): Promise<LiveChatAiResult> {
  const userMessage = lastUserMessage(input.history);
  const apiKey = await resolveOpenAiApiKey();

  if (!apiKey) {
    return answerFromSiteKnowledge({ locale: input.locale, message: userMessage });
  }

  try {
    const knowledge = await buildLiveChatKnowledge(
      (input.locale === "ka" || input.locale === "ru" ? input.locale : "en") as Locale,
    );
    const withinHours = isOperatorHours();

    const system = [
      "You are the customer-support assistant for rentairportcars.com (airport car rental).",
      "CRITICAL STYLE: Always answer SHORT and SIMPLE — 1–3 short sentences max (≈40–60 words).",
      "Use plain everyday language. No long lists, no dumping the full fleet/catalog, no essay.",
      "If more detail exists, give the key point and invite one follow-up question.",
      "Answer ONLY using the SITE KNOWLEDGE below and general polite guidance.",
      "If the answer is not in the knowledge, say you are not sure briefly and set exhausted=true.",
      "Do not invent prices, availability, or policies. Prefer ranges or “see search results” over listing many cars.",
      "Reply in the user's language (Georgian, Russian, or English as appropriate).",
      `Operator live chat hours: ${operatorHoursLabel()}. Currently within hours: ${withinHours ? "yes" : "no"}.`,
      "Set userWantsOperator=true only if the user clearly asks for a human/operator/live agent.",
      "Set exhausted=true only when you truly cannot answer from knowledge after trying.",
      "Never promise an immediate human connection outside operator hours.",
      "Respond with JSON only: {\"reply\":\"...\",\"exhausted\":boolean,\"userWantsOperator\":boolean}",
      "",
      "SITE KNOWLEDGE:",
      knowledge.slice(0, 24000),
    ].join("\n");

    const messages = [
      { role: "system", content: system },
      ...input.history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-16)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[live-chat] OpenAI error", res.status, errText.slice(0, 300));
      return answerFromSiteKnowledge({ locale: input.locale, message: userMessage });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || "";
    return parseAiJson(content);
  } catch (error) {
    console.warn("[live-chat] OpenAI failed, using site knowledge", error);
    return answerFromSiteKnowledge({ locale: input.locale, message: userMessage });
  }
}
