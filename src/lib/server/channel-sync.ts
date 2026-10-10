import "server-only";

import { lookup } from "node:dns/promises";
import { parseIcalEvents } from "@/lib/channel/ical";
import {
  listChannelFeeds,
  saveChannelFeedBusy,
  type ChannelFeed,
} from "@/lib/server/channel-feeds-store";
import { computeBufferEndsAt, rangesOverlap } from "@/lib/calendar/buffer";

const STALE_MS = 15 * 60 * 1000;

function isPrivateIp(address: string) {
  const host = address.toLowerCase();
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export async function assertPublicHttps(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("მხოლოდ https ბმულია დასაშვები");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("შიდა მისამართი დაბლოკილია");
  }
  if (isPrivateIp(host)) throw new Error("შიდა მისამართი დაბლოკილია");
  const resolved = await lookup(host);
  if (isPrivateIp(resolved.address)) throw new Error("შიდა მისამართი დაბლოკილია");
  return url.toString();
}

async function fetchIcal(raw: string) {
  let current = raw;
  for (let hop = 0; hop < 3; hop += 1) {
    current = await assertPublicHttps(current);
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "text/calendar, text/plain", "User-Agent": "RentAirportCars-Channel/1.0" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("კალენდრის ბმული გადამისამართდა პასუხის გარეშე");
      current = new URL(loc, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`კალენდარი არ გაიხსნა (${res.status})`);
    const text = await res.text();
    if (text.length > 1_000_000) throw new Error("კალენდარი ძალიან დიდია");
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("ეს iCal კალენდარი არ არის");
    return text;
  }
  throw new Error("ძალიან ბევრი გადამისამართება");
}

export async function syncChannelFeed(feed: ChannelFeed) {
  if (!feed.importUrl.trim()) {
    return saveChannelFeedBusy(feed.id, [], null);
  }
  try {
    const text = await fetchIcal(feed.importUrl);
    const busy = parseIcalEvents(text);
    return saveChannelFeedBusy(feed.id, busy, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "სინქრონიზაცია ვერ მოხერხდა";
    await saveChannelFeedBusy(feed.id, feed.busy, message);
    return null;
  }
}

export async function syncStaleChannelFeeds() {
  const feeds = await listChannelFeeds();
  const now = Date.now();
  let synced = 0;
  for (const feed of feeds) {
    if (!feed.importUrl.trim()) continue;
    const last = feed.lastSyncAt ? new Date(feed.lastSyncAt).getTime() : 0;
    if (last && now - last < STALE_MS) continue;
    await syncChannelFeed(feed);
    synced += 1;
  }
  return synced;
}

export async function channelBlocksCar(carId: string, pickupAt: Date, dropoffAt: Date) {
  const occupiedUntil = computeBufferEndsAt(dropoffAt);
  const feeds = await listChannelFeeds();
  for (const feed of feeds) {
    if (feed.carId !== carId) continue;
    for (const event of feed.busy) {
      const start = new Date(event.start);
      const end = computeBufferEndsAt(new Date(event.end));
      if (rangesOverlap(pickupAt, occupiedUntil, start, end)) return true;
    }
  }
  return apiBlocksCar(carId, pickupAt, dropoffAt);
}

export async function carIdsBlockedByChannels(rangeStart: Date, rangeEnd: Date) {
  const ids = new Set<string>();
  const occupiedUntil = computeBufferEndsAt(rangeEnd);
  const feeds = await listChannelFeeds();
  for (const feed of feeds) {
    for (const event of feed.busy) {
      const start = new Date(event.start);
      const end = computeBufferEndsAt(new Date(event.end));
      if (rangesOverlap(rangeStart, occupiedUntil, start, end)) ids.add(feed.carId);
    }
  }
  for (const block of await apiAvailabilityBlocks()) {
    const start = new Date(block.start);
    const end = computeBufferEndsAt(new Date(block.end));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (rangesOverlap(rangeStart, occupiedUntil, start, end)) ids.add(block.carId);
  }
  return ids;
}

type ApiBlock = { carId: string; start: string; end: string };
let apiBlockCache: { at: number; rows: ApiBlock[] } | null = null;

async function apiAvailabilityBlocks(): Promise<ApiBlock[]> {
  if (apiBlockCache && Date.now() - apiBlockCache.at < 20_000) return apiBlockCache.rows;
  const rows: ApiBlock[] = [];
  try {
    const { listIntegrationsFile, listMappingsFile } = await import("@/lib/server/integration-store");
    const integrations = await listIntegrationsFile();
    for (const integration of integrations) {
      if (integration.status !== "LIVE" && integration.status !== "TESTING") continue;
      const maps = await listMappingsFile(integration.id);
      for (const map of maps) {
        if (map.kind !== "VEHICLE") continue;
        const blocks = map.meta?.availabilityBlocks;
        if (!Array.isArray(blocks)) continue;
        for (const block of blocks) {
          if (!block || typeof block !== "object") continue;
          const start = String((block as { from?: unknown }).from || "");
          const end = String((block as { to?: unknown }).to || "");
          if (start && end) rows.push({ carId: map.internalId, start, end });
        }
      }
    }
  } catch {
    /* integration file optional */
  }
  try {
    const { listAllApiAvailability } = await import("@/lib/server/partner-api-availability-store");
    rows.push(...(await listAllApiAvailability()));
  } catch {
    /* partner API store optional */
  }
  apiBlockCache = { at: Date.now(), rows };
  return rows;
}

export function resetApiBlockCache() {
  apiBlockCache = null;
}

export async function apiBlocksCar(carId: string, pickupAt: Date, dropoffAt: Date) {
  const occupiedUntil = computeBufferEndsAt(dropoffAt);
  for (const block of await apiAvailabilityBlocks()) {
    if (block.carId !== carId) continue;
    const start = new Date(block.start);
    const end = computeBufferEndsAt(new Date(block.end));
    if (rangesOverlap(pickupAt, occupiedUntil, start, end)) return true;
  }
  return false;
}
