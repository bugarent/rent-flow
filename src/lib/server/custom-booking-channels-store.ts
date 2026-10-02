import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  DEFAULT_CUSTOM_BOOKING_CHANNELS,
  type CustomBookingChannel,
  type CustomBookingChannelsConfig,
} from "@/lib/catalog/custom-booking-channels";
import { createTtlCache } from "@/lib/server/ttl-cache";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "custom-booking-channels.json");
const cache = createTtlCache<CustomBookingChannelsConfig>(20_000);

type LegacyChannel = Partial<CustomBookingChannel> & { url?: string };

function normalizeChannel(
  raw: LegacyChannel | undefined,
  fallback: CustomBookingChannel,
): CustomBookingChannel {
  const contact = String(raw?.contact ?? raw?.url ?? fallback.contact ?? "").trim();
  return {
    enabled: Boolean(raw?.enabled ?? fallback.enabled),
    contact,
  };
}

async function writeConfig(config: CustomBookingChannelsConfig) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
  cache.set(config);
  revalidatePublishedContent();
}

export async function getCustomBookingChannelsConfig(): Promise<CustomBookingChannelsConfig> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<CustomBookingChannelsConfig> & {
      instagram?: LegacyChannel;
    };
    const telegramRaw = parsed.telegram ?? parsed.instagram;
    const next = {
      online: normalizeChannel(parsed.online as LegacyChannel, DEFAULT_CUSTOM_BOOKING_CHANNELS.online),
      whatsapp: normalizeChannel(parsed.whatsapp as LegacyChannel, DEFAULT_CUSTOM_BOOKING_CHANNELS.whatsapp),
      viber: normalizeChannel(parsed.viber as LegacyChannel, DEFAULT_CUSTOM_BOOKING_CHANNELS.viber),
      telegram: normalizeChannel(telegramRaw as LegacyChannel, DEFAULT_CUSTOM_BOOKING_CHANNELS.telegram),
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
    cache.set(next);
    return next;
  } catch {
    return {
      ...DEFAULT_CUSTOM_BOOKING_CHANNELS,
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function saveCustomBookingChannelsConfig(
  input: Omit<CustomBookingChannelsConfig, "updatedAt">,
): Promise<CustomBookingChannelsConfig> {
  const next: CustomBookingChannelsConfig = {
    online: normalizeChannel(input.online, DEFAULT_CUSTOM_BOOKING_CHANNELS.online),
    whatsapp: normalizeChannel(input.whatsapp, DEFAULT_CUSTOM_BOOKING_CHANNELS.whatsapp),
    viber: normalizeChannel(input.viber, DEFAULT_CUSTOM_BOOKING_CHANNELS.viber),
    telegram: normalizeChannel(input.telegram, DEFAULT_CUSTOM_BOOKING_CHANNELS.telegram),
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(next);
  return next;
}

export async function getPublicCustomBookingChannels(): Promise<CustomBookingChannelsConfig> {
  return getCustomBookingChannelsConfig();
}
