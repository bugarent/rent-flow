import "server-only";

import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";

async function openAiKey(): Promise<string | null> {
  try {
    const fromSettings = (await getPlatformSettings()).openaiApiKey?.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* settings file can be missing in local dev */
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

/** Translate one airport preface into the requested languages. Empty on failure. */
export async function translateAirportPreface(
  text: string,
  locales: Locale[],
): Promise<Partial<Record<Locale, string>>> {
  const source = text.trim();
  const targets = [...new Set(locales)];
  if (!source || !targets.length) return {};
  const apiKey = await openAiKey();
  if (!apiKey) {
    console.warn("[airport-preface] OpenAI key missing; preface stays in the original language");
    return {};
  }

  const names = targets.map((code) => `${code} (${LOCALE_LABELS[code]})`).join(", ");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You translate airport car-rental introductions. Reply with a JSON object whose keys are the locale codes and whose values are the full translation. Keep paragraph breaks, IATA codes, place names, prices and phone numbers. Do not add a title or commentary.",
          },
          {
            role: "user",
            content: `Translate into: ${names}\n\n${source}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[airport-preface] OpenAI", res.status, (await res.text()).slice(0, 240));
      return {};
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content || "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw) as Record<
      string,
      unknown
    >;
    const bag =
      parsed.translations && typeof parsed.translations === "object"
        ? (parsed.translations as Record<string, unknown>)
        : parsed;
    const out: Partial<Record<Locale, string>> = {};
    for (const code of targets) {
      const value = typeof bag[code] === "string" ? bag[code].trim() : "";
      if (value) out[code] = value.slice(0, 8000);
    }
    return out;
  } catch (error) {
    console.warn("[airport-preface] translate", error);
    return {};
  }
}
