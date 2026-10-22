import "server-only";

import type { Locale } from "@/lib/i18n/config";

const GOOGLE_CODES: Partial<Record<Locale, string>> = { zh: "zh-CN" };
/** The public endpoint rejects very long bodies; long texts go paragraph by paragraph. */
const MAX_CHUNK = 1800;
const CONCURRENCY = 4;

function chunksOf(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const out: string[] = [];
  let current = "";
  for (const part of text.split(/(\n+)/)) {
    if (current && current.length + part.length > MAX_CHUNK) {
      out.push(current);
      current = "";
    }
    current += part;
  }
  if (current) out.push(current);
  return out;
}

async function translateChunk(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: text }).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = (await res.json()) as unknown;
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
  return segments
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
    .join("");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The free endpoint answers 429/500 under bursts; space calls out and retry with backoff. */
async function withRetry(run: () => Promise<string>): Promise<string> {
  let lastError: unknown;
  for (const wait of [0, 1500, 4000]) {
    if (wait) await sleep(wait);
    try {
      const value = await run();
      await sleep(250);
      return value;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Keyless machine translation used when no OpenAI key is configured.
 * Returns only the languages that translated; failures are skipped so callers retry later.
 */
export async function freeTranslate(
  text: string,
  locales: Locale[],
): Promise<Partial<Record<Locale, string>>> {
  const source = text.trim();
  const out: Partial<Record<Locale, string>> = {};
  if (!source) return out;
  const queue = [...new Set(locales)];
  const worker = async () => {
    for (let code = queue.shift(); code; code = queue.shift()) {
      try {
        const target = GOOGLE_CODES[code] || code;
        const parts: string[] = [];
        for (const chunk of chunksOf(source)) parts.push(await withRetry(() => translateChunk(chunk, target)));
        const value = parts.join("").trim();
        if (value) out[code] = value;
      } catch (error) {
        console.warn("[free-translate]", code, error instanceof Error ? error.message : error);
      }
    }
  };
  // A few languages at a time keeps an admin save short without tripping the rate limit.
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return out;
}
