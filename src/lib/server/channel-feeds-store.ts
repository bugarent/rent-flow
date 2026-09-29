import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/server/data-paths";
import type { IcalEvent } from "@/lib/channel/ical";

export const CHANNEL_PROVIDERS = ["google", "localrent", "takecars", "ical"] as const;
export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number];

export type ChannelFeed = {
  id: string;
  partnerId: string;
  carId: string;
  provider: ChannelProvider;
  importUrl: string;
  exportToken: string;
  busy: IcalEvent[];
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

type StoreFile = { feeds: ChannelFeed[] };

async function storePath() {
  return resolveDataFile("partner", "channel-feeds.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { feeds: Array.isArray(parsed.feeds) ? parsed.feeds : [] };
  } catch {
    return { feeds: [] };
  }
}

async function writeStore(data: StoreFile) {
  const path = await storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

export async function listChannelFeedsForPartner(partnerId: string) {
  const { feeds } = await readStore();
  return feeds.filter((feed) => feed.partnerId === partnerId);
}

/** Stable outgoing iCal token for a car. Reuses any existing feed for that car. */
export async function ensureCarExportFeed(partnerId: string, carId: string) {
  const { feeds } = await readStore();
  const existing = feeds.find((feed) => feed.partnerId === partnerId && feed.carId === carId);
  if (existing) return existing;
  return upsertChannelFeed({
    partnerId,
    carId,
    provider: "ical",
    importUrl: "",
  });
}

export async function listChannelFeeds() {
  const { feeds } = await readStore();
  return feeds;
}

export async function getChannelFeedByToken(token: string) {
  const key = token.trim();
  if (!key) return null;
  const { feeds } = await readStore();
  return feeds.find((feed) => feed.exportToken === key) || null;
}

export async function getChannelFeed(id: string) {
  const { feeds } = await readStore();
  return feeds.find((feed) => feed.id === id) || null;
}

export async function upsertChannelFeed(input: {
  partnerId: string;
  carId: string;
  provider: ChannelProvider;
  importUrl: string;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.feeds.find(
    (feed) => feed.partnerId === input.partnerId && feed.carId === input.carId && feed.provider === input.provider,
  );
  if (existing) {
    existing.importUrl = input.importUrl.trim();
    existing.updatedAt = now;
    await writeStore(store);
    return existing;
  }
  const feed: ChannelFeed = {
    id: randomUUID(),
    partnerId: input.partnerId,
    carId: input.carId,
    provider: input.provider,
    importUrl: input.importUrl.trim(),
    exportToken: randomBytes(24).toString("hex"),
    busy: [],
    lastSyncAt: null,
    lastError: null,
    updatedAt: now,
  };
  store.feeds.unshift(feed);
  await writeStore(store);
  return feed;
}

export async function saveChannelFeedBusy(id: string, busy: IcalEvent[], error: string | null) {
  const store = await readStore();
  const feed = store.feeds.find((row) => row.id === id);
  if (!feed) return null;
  feed.busy = busy;
  feed.lastError = error;
  feed.lastSyncAt = new Date().toISOString();
  feed.updatedAt = feed.lastSyncAt;
  await writeStore(store);
  return feed;
}

export async function deleteChannelFeed(id: string, partnerId: string) {
  const store = await readStore();
  const before = store.feeds.length;
  store.feeds = store.feeds.filter((feed) => !(feed.id === id && feed.partnerId === partnerId));
  if (store.feeds.length === before) return false;
  await writeStore(store);
  return true;
}

export async function touchChannelFeedsForCar(carId: string) {
  const store = await readStore();
  const now = new Date().toISOString();
  let changed = false;
  for (const feed of store.feeds) {
    if (feed.carId !== carId) continue;
    feed.updatedAt = now;
    changed = true;
  }
  if (changed) await writeStore(store);
}
