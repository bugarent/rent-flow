import { LOCALES, type Locale } from "@/lib/i18n/config";
import { knownText } from "@/lib/i18n/known-record-text";

export type ExtraCopyBag = Partial<Record<Locale, string>>;

const LOCALE_SET = new Set<string>(LOCALES);

/** Translations stored beside the original extra name or description. */
export function readExtraI18n(value: unknown): ExtraCopyBag {
  if (!value || typeof value !== "object" || !("i18n" in value)) return {};
  const raw = (value as { i18n?: unknown }).i18n;
  if (!raw || typeof raw !== "object") return {};
  const out: ExtraCopyBag = {};
  for (const [key, text] of Object.entries(raw as Record<string, unknown>)) {
    if (!LOCALE_SET.has(key) || typeof text !== "string" || !text.trim()) continue;
    out[key as Locale] = text.trim();
  }
  return out;
}

/** Language the admin typed, so that language keeps the original wording. */
export function extraCopySourceLocale(text: string): Locale {
  if (/[\u10A0-\u10FF]/.test(text)) return "ka";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  return "en";
}

export function localizedExtraCopy(locale: string, source: string, i18n?: ExtraCopyBag | null): string {
  const saved = i18n?.[locale as Locale]?.trim();
  if (saved) return saved;
  return knownText(locale, source || "");
}

/** Locales that still need a machine translation. Known catalog phrases are already covered. */
export function missingExtraCopyLocales(source: string, bag?: ExtraCopyBag | null): Locale[] {
  const text = source.trim();
  if (!text) return [];
  const origin = extraCopySourceLocale(text);
  const missing: Locale[] = [];
  for (const code of LOCALES) {
    if (code === origin) continue;
    if (bag?.[code]?.trim()) continue;
    const known = knownText(code, text).trim();
    if (known && known !== text) continue;
    missing.push(code);
  }
  return missing;
}
