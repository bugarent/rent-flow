import "server-only";

import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";
import { knownText } from "@/lib/i18n/known-record-text";
import {
  extraCopySourceLocale,
  missingExtraCopyLocales,
  readExtraI18n,
  type ExtraCopyBag,
} from "@/lib/extras/localized-copy";
import { localizeExtraName } from "@/lib/extras/pricing";
import { prisma, isDbCircuitOpen, noteDbOfflineOnce } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import { readFileStore, writeFileStore } from "./file-store";
import { clearExtrasCatalogCache } from "./list";

async function openAiKey(): Promise<string | null> {
  try {
    const fromSettings = (await getPlatformSettings()).openaiApiKey?.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* settings file can be missing in local dev */
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function seedKnown(source: string, bag: ExtraCopyBag): ExtraCopyBag {
  const text = source.trim();
  const next = { ...bag };
  if (!text) return next;
  const origin = extraCopySourceLocale(text);
  next[origin] = text;
  for (const code of LOCALES) {
    if (next[code]?.trim()) continue;
    const known = knownText(code, text).trim();
    if (known && known !== text) next[code] = known;
  }
  return next;
}

async function translatePair(
  name: string,
  description: string,
  locales: Locale[],
): Promise<{ name: ExtraCopyBag; description: ExtraCopyBag }> {
  const targets = [...new Set(locales)];
  if (!targets.length) return { name: {}, description: {} };
  const apiKey = await openAiKey();
  if (!apiKey) return { name: {}, description: {} };

  const names = targets.map((code) => `${code} (${LOCALE_LABELS[code]})`).join(", ");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const payload = {
    name: name.trim(),
    description: description.trim(),
  };
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
              "You translate car-rental extra services. Reply with JSON {\"name\": {locale: text}, \"description\": {locale: text}}. Keep prices, numbers and product names. Do not add commentary. If description is empty, return an empty description object.",
          },
          {
            role: "user",
            content: `Translate name and description into: ${names}\n\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[extra-copy] OpenAI", res.status, (await res.text()).slice(0, 240));
      return { name: {}, description: {} };
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content || "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw) as {
      name?: Record<string, unknown>;
      description?: Record<string, unknown>;
    };
    const take = (bag: Record<string, unknown> | undefined) => {
      const out: ExtraCopyBag = {};
      if (!bag) return out;
      for (const code of targets) {
        const value = typeof bag[code] === "string" ? bag[code].trim() : "";
        if (value) out[code] = value.slice(0, 4000);
      }
      return out;
    };
    return { name: take(parsed.name), description: description.trim() ? take(parsed.description) : {} };
  } catch (error) {
    console.warn("[extra-copy] translate", error);
    return { name: {}, description: {} };
  }
}

export async function fillExtraCopy(
  name: string,
  description: string,
  existing?: { name?: ExtraCopyBag | null; description?: ExtraCopyBag | null },
): Promise<{ nameI18n: ExtraCopyBag; descriptionI18n: ExtraCopyBag }> {
  const nameI18n = seedKnown(name, { ...(existing?.name || {}) });
  const descriptionI18n = seedKnown(description, { ...(existing?.description || {}) });
  const nameMissing = missingExtraCopyLocales(name, nameI18n);
  const descriptionMissing = missingExtraCopyLocales(description, descriptionI18n);
  const locales = [...new Set([...nameMissing, ...descriptionMissing])];
  if (!locales.length) return { nameI18n, descriptionI18n };
  const translated = await translatePair(name, description, locales);
  return {
    nameI18n: { ...nameI18n, ...translated.name },
    descriptionI18n: { ...descriptionI18n, ...translated.description },
  };
}

function jsonWithI18n(current: unknown, en: string, i18n: ExtraCopyBag): Prisma.InputJsonValue {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  return { ...base, en, i18n } as Prisma.InputJsonValue;
}

/** Fill missing name and description translations for the extras catalog. */
export async function ensureExtraCopyTranslations(): Promise<void> {
  if (!isDbCircuitOpen()) {
    try {
      const rows = await prisma.extraService.findMany();
      let changed = false;
      for (const row of rows) {
        const name = localizeExtraName(row.name);
        const description = localizeExtraName(row.description, "");
        const nameI18n = readExtraI18n(row.name);
        const descriptionI18n = readExtraI18n(row.description);
        if (
          missingExtraCopyLocales(name, nameI18n).length === 0 &&
          missingExtraCopyLocales(description, descriptionI18n).length === 0
        ) {
          continue;
        }
        const filled = await fillExtraCopy(name, description, { name: nameI18n, description: descriptionI18n });
        await prisma.extraService.update({
          where: { id: row.id },
          data: {
            name: jsonWithI18n(row.name, name, filled.nameI18n),
            description: jsonWithI18n(row.description, description, filled.descriptionI18n),
          },
        });
        changed = true;
      }
      if (!changed) return;
      const fileRows = await readFileStore().catch(() => []);
      if (!fileRows.length) {
        clearExtrasCatalogCache();
        return;
      }
      const fresh = await prisma.extraService.findMany();
      const bySlug = new Map(fresh.map((row) => [row.slug, row]));
      await writeFileStore(
        fileRows.map((row) => {
          const db = bySlug.get(row.slug);
          if (!db) return row;
          return {
            ...row,
            nameI18n: readExtraI18n(db.name),
            descriptionI18n: readExtraI18n(db.description),
          };
        }),
      );
      clearExtrasCatalogCache();
      return;
    } catch (error) {
      if (isDbOfflineError(error)) noteDbOfflineOnce("extra-copy", error);
      else console.warn("[extra-copy] ensure", error);
    }
  }

  const fileRows = await readFileStore().catch(() => []);
  let changed = false;
  const next = [];
  for (const row of fileRows) {
    if (
      missingExtraCopyLocales(row.name, row.nameI18n).length === 0 &&
      missingExtraCopyLocales(row.description || "", row.descriptionI18n).length === 0
    ) {
      next.push(row);
      continue;
    }
    const filled = await fillExtraCopy(row.name, row.description || "", {
      name: row.nameI18n,
      description: row.descriptionI18n,
    });
    changed = true;
    next.push({ ...row, nameI18n: filled.nameI18n, descriptionI18n: filled.descriptionI18n });
  }
  if (changed) {
    await writeFileStore(next);
    clearExtrasCatalogCache();
  }
}
