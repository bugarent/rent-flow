import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { DEFAULT_FX_RATES } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export type PlatformSettingsRecord = {
  depositPercent: number;
  telegramBotSiteName: string;
  eurUsdRate: number;
  eurGbpRate: number;
  eurGelRate: number;
  eurRubRate: number;
  /** ISO timestamp of last successful FX cron sync (optional). */
  fxRatesUpdatedAt: string;
  googleMapsUrl: string;
  partnerOperatingCountryIso2s: string[];
  /** Platform rental contract PDF/image shown to partners and used at checkout by default. */
  siteContractUrl: string;
  /** Telegram chat that receives new bookings and booking changes. */
  adminTelegramChatId: string;
  /**
   * Optional Bot API token override (file store). Falls back to TELEGRAM_BOT_TOKEN env.
   * Prefer env in production; admin UI can set a working token for @rentairportcarsbot.
   */
  telegramBotToken: string;
  /** Bot username without @ — default rentairportcarsbot. */
  telegramBotUsername: string;
  /** Optional OpenAI API key for live chat (file store). Falls back to OPENAI_API_KEY env. */
  openaiApiKey: string;
};

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "platform-settings.json");

function defaults(): PlatformSettingsRecord {
  return {
    depositPercent: 15,
    telegramBotSiteName: "rentairportcars.com",
    eurUsdRate: DEFAULT_FX_RATES.eurUsd,
    eurGbpRate: DEFAULT_FX_RATES.eurGbp,
    eurGelRate: DEFAULT_FX_RATES.eurGel,
    eurRubRate: DEFAULT_FX_RATES.eurRub,
    fxRatesUpdatedAt: "",
    googleMapsUrl: "",
    partnerOperatingCountryIso2s: [],
    siteContractUrl: "",
    adminTelegramChatId: "",
    telegramBotToken: "",
    telegramBotUsername: "rentairportcarsbot",
    openaiApiKey: "",
  };
}

function normalize(raw: Partial<PlatformSettingsRecord> | null | undefined): PlatformSettingsRecord {
  const base = defaults();
  if (!raw || typeof raw !== "object") return base;
  return {
    depositPercent: Math.trunc(toNumber(raw.depositPercent, base.depositPercent)),
    telegramBotSiteName: String(raw.telegramBotSiteName || base.telegramBotSiteName).trim() || base.telegramBotSiteName,
    eurUsdRate: toNumber(raw.eurUsdRate, base.eurUsdRate),
    eurGbpRate: toNumber(raw.eurGbpRate, base.eurGbpRate),
    eurGelRate: toNumber(raw.eurGelRate, base.eurGelRate),
    eurRubRate: toNumber(raw.eurRubRate, base.eurRubRate),
    fxRatesUpdatedAt: String(raw.fxRatesUpdatedAt || "").trim(),
    googleMapsUrl: String(raw.googleMapsUrl ?? ""),
    partnerOperatingCountryIso2s: Array.isArray(raw.partnerOperatingCountryIso2s)
      ? raw.partnerOperatingCountryIso2s.map((x) => String(x).toUpperCase()).filter((x) => x.length === 2)
      : [],
    siteContractUrl: typeof raw.siteContractUrl === "string" ? raw.siteContractUrl.trim() : base.siteContractUrl,
    adminTelegramChatId:
      typeof raw.adminTelegramChatId === "string" ? raw.adminTelegramChatId.trim() : base.adminTelegramChatId,
    telegramBotToken:
      typeof raw.telegramBotToken === "string" ? raw.telegramBotToken.trim() : base.telegramBotToken,
    telegramBotUsername:
      typeof raw.telegramBotUsername === "string"
        ? raw.telegramBotUsername.trim().replace(/^@/, "") || base.telegramBotUsername
        : base.telegramBotUsername,
    openaiApiKey: typeof raw.openaiApiKey === "string" ? raw.openaiApiKey.trim() : base.openaiApiKey,
  };
}

async function readFileStore(): Promise<PlatformSettingsRecord> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<PlatformSettingsRecord>);
  } catch {
    const next = defaults();
    await writeFileStore(next);
    return next;
  }
}

async function writeFileStore(settings: PlatformSettingsRecord) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(settings, null, 2), "utf8");
}

function fromDbRow(row: {
  depositPercent: number;
  telegramBotSiteName: string;
  eurUsdRate: unknown;
  eurGbpRate: unknown;
  eurGelRate: unknown;
  googleMapsUrl: string | null;
  partnerOperatingCountryIso2s: unknown;
  eurRubRate?: unknown;
  fxRatesUpdatedAt?: Date | string | null;
}): PlatformSettingsRecord {
  const countries = (() => {
    try {
      if (Array.isArray(row.partnerOperatingCountryIso2s)) {
        return row.partnerOperatingCountryIso2s.map(String);
      }
      if (typeof row.partnerOperatingCountryIso2s === "string") {
        return JSON.parse(row.partnerOperatingCountryIso2s) as string[];
      }
    } catch {
      /* ignore */
    }
    return [];
  })();

  const fxUpdated =
    row.fxRatesUpdatedAt instanceof Date
      ? row.fxRatesUpdatedAt.toISOString()
      : String(row.fxRatesUpdatedAt || "").trim();

  return normalize({
    depositPercent: row.depositPercent,
    telegramBotSiteName: row.telegramBotSiteName,
    eurUsdRate: toNumber(row.eurUsdRate, DEFAULT_FX_RATES.eurUsd),
    eurGbpRate: toNumber(row.eurGbpRate, DEFAULT_FX_RATES.eurGbp),
    eurGelRate: toNumber(row.eurGelRate, DEFAULT_FX_RATES.eurGel),
    eurRubRate: toNumber(row.eurRubRate, DEFAULT_FX_RATES.eurRub),
    fxRatesUpdatedAt: fxUpdated,
    googleMapsUrl: row.googleMapsUrl ?? "",
    partnerOperatingCountryIso2s: countries,
  });
}

type CacheEntry = { at: number; value: PlatformSettingsRecord };
let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 20_000;

function setCache(value: PlatformSettingsRecord) {
  memoryCache = { at: Date.now(), value };
}

export async function getPlatformSettings(): Promise<PlatformSettingsRecord> {
  if (memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) {
    return memoryCache.value;
  }

  const fileSettings = await readFileStore();
  const { isDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) {
    setCache(fileSettings);
    return fileSettings;
  }
  try {
    const row = await prisma.platformSetting.findUnique({ where: { id: "default" } });
    if (row) {
      const next = fromDbRow(row as Parameters<typeof fromDbRow>[0]);
      // File-only fields (not in Prisma platformSetting row).
      const merged = normalize({
        ...next,
        siteContractUrl: fileSettings.siteContractUrl || next.siteContractUrl,
        adminTelegramChatId: fileSettings.adminTelegramChatId || next.adminTelegramChatId,
        telegramBotToken: fileSettings.telegramBotToken || next.telegramBotToken,
        telegramBotUsername: fileSettings.telegramBotUsername || next.telegramBotUsername,
        openaiApiKey: fileSettings.openaiApiKey || next.openaiApiKey,
      });
      setCache(merged);
      return merged;
    }
  } catch (error) {
      const { markDbCircuitOpen } = await import("@/lib/prisma");
      markDbCircuitOpen("platform-settings", error);
  }
  setCache(fileSettings);
  return fileSettings;
}

export async function savePlatformSettings(
  patch: Partial<PlatformSettingsRecord>,
): Promise<PlatformSettingsRecord> {
  const current = await getPlatformSettings();
  const next = normalize({ ...current, ...patch });

  try {
    const data = {
      depositPercent: next.depositPercent,
      telegramBotSiteName: next.telegramBotSiteName,
      eurUsdRate: next.eurUsdRate,
      eurGbpRate: next.eurGbpRate,
      eurGelRate: next.eurGelRate,
      googleMapsUrl: next.googleMapsUrl || null,
      partnerOperatingCountryIso2s: next.partnerOperatingCountryIso2s,
    };
    const fxAt = next.fxRatesUpdatedAt ? new Date(next.fxRatesUpdatedAt) : null;
    try {
      await prisma.platformSetting.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          ...data,
          eurRubRate: next.eurRubRate,
          ...(fxAt && !Number.isNaN(fxAt.getTime()) ? { fxRatesUpdatedAt: fxAt } : {}),
        },
        update: {
          ...data,
          eurRubRate: next.eurRubRate,
          ...(fxAt && !Number.isNaN(fxAt.getTime()) ? { fxRatesUpdatedAt: fxAt } : {}),
        },
      });
    } catch {
      // Column eurRubRate / fxRatesUpdatedAt may be missing until migration — save without them.
      await prisma.platformSetting.upsert({
        where: { id: "default" },
        create: { id: "default", ...data },
        update: data,
      });
    }
  } catch (error) {
    console.warn("[platform-settings] DB write failed, using file store:", error);
  }

  await writeFileStore(next);
  setCache(next);
  return next;
}
