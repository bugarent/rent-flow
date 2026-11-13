import "server-only";

import type { Locale } from "@/lib/i18n/config";

const GOOGLE_CODES: Partial<Record<Locale, string>> = { zh: "zh-CN" };
const MYMEMORY_CODES: Partial<Record<Locale, string>> = { zh: "zh-CN" };
/** The public endpoint rejects very long bodies; long texts go paragraph by paragraph. */
const MAX_CHUNK = 1800;
/** MyMemory refuses longer queries. */
const MYMEMORY_MAX = 480;
const CONCURRENCY = 6;

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

/** Several short texts into one language with a single request. */
async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const body = new URLSearchParams();
  for (const text of texts) body.append("q", text);
  const url = `https://translate.googleapis.com/translate_a/t?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&format=text`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body.toString(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = (await res.json()) as unknown;
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length !== texts.length) throw new Error("translate batch size mismatch");
  return rows.map((row) => {
    if (typeof row === "string") return row;
    if (Array.isArray(row) && typeof row[0] === "string") return row[0];
    return "";
  });
}

async function translateMyMemory(text: string, source: Locale, target: Locale): Promise<string> {
  if (text.length > MYMEMORY_MAX) throw new Error("mymemory text too long");
  const pair = `${MYMEMORY_CODES[source] || source}|${MYMEMORY_CODES[target] || target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = (await res.json()) as {
    responseStatus?: number | string;
    quotaFinished?: boolean;
    responseData?: { translatedText?: string };
  };
  if (data.quotaFinished || Number(data.responseStatus) !== 200) throw new Error("mymemory refused");
  const value = String(data.responseData?.translatedText || "").trim();
  if (!value || /^MYMEMORY WARNING/i.test(value)) throw new Error("mymemory empty");
  return value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The free endpoint answers 429/500 under bursts; space calls out and retry with backoff. */
async function withRetry<T>(run: () => Promise<T>, waits = [0, 1500, 4000]): Promise<T> {
  let lastError: unknown;
  for (const wait of waits) {
    if (wait) await sleep(wait);
    try {
      const value = await run();
      await sleep(150);
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

/**
 * Short texts (a name and its description) into many languages: one request per language.
 * When the main endpoint is rate limited, each text falls back to MyMemory, which needs the source language.
 */
export async function freeTranslateMany(
  texts: string[],
  locales: Locale[],
  sourceLocale: Locale,
): Promise<Partial<Record<Locale, string[]>>> {
  const out: Partial<Record<Locale, string[]>> = {};
  const indexes = texts.map((text, i) => (text.trim() ? i : -1)).filter((i) => i >= 0);
  if (!indexes.length) return out;
  const sources = indexes.map((i) => texts[i].trim());
  const tooLong = sources.some((text) => text.length > MAX_CHUNK);
  const queue = [...new Set(locales)].filter((code) => code !== sourceLocale);

  const place = (values: string[]) => {
    const row = texts.map(() => "");
    indexes.forEach((i, k) => {
      row[i] = values[k]?.trim() || "";
    });
    return row;
  };

  const worker = async () => {
    for (let code = queue.shift(); code; code = queue.shift()) {
      const target = GOOGLE_CODES[code] || code;
      try {
        const values = tooLong
          ? await Promise.all(sources.map((text) => freeTranslate(text, [code]).then((r) => r[code] || "")))
          : await withRetry(() => translateBatch(sources, target), [0, 1200]);
        if (values.every((value) => value.trim())) {
          out[code] = place(values);
          continue;
        }
      } catch (error) {
        console.warn("[free-translate]", code, error instanceof Error ? error.message : error);
      }
      try {
        const values = await Promise.all(
          sources.map((text) => withRetry(() => translateMyMemory(text, sourceLocale, code), [0, 1500])),
        );
        out[code] = place(values);
      } catch (error) {
        console.warn("[free-translate] backup", code, error instanceof Error ? error.message : error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return out;
}
