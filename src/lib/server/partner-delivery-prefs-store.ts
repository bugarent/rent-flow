import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, readFileForUpdate, withStoreLock, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { capFreeAfterDays } from "@/lib/delivery/pricing";

const STORE = join(dataRoot(), "partner-delivery-prefs.json");

export type PartnerDeliveryPref = {
  deliveryLocationId: string;
  enabled: boolean;
  /** One-way delivery / collection fee in EUR */
  priceEur: number;
  /** Rental days greater than this → fee waived (null = never free by days) */
  freeAfterDays: number | null;
  travelTimeMinutes: number;
};

type StoreFile = Record<string, PartnerDeliveryPref[]>;

/** Last copy read or written by this instance; used only when the saved store cannot be reached. */
let lastGood: StoreFile | null = null;
/** A slow database must not stall search pages when a recent copy is already in memory. */
const FRESH_READ_WAIT_MS = 4000;

function parseStore(raw: string | null): StoreFile | null {
  if (raw == null) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as StoreFile;
}

/**
 * Prices must be the latest saved ones: a stale per-instance copy would show a
 * partner their old prices after saving and charge customers the old fee.
 */
async function readStore(): Promise<StoreFile> {
  try {
    const fresh = readFileForUpdate(STORE).then(parseStore);
    const store = lastGood
      ? await Promise.race([
          fresh,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), FRESH_READ_WAIT_MS)),
        ])
      : await fresh;
    if (store) {
      lastGood = store;
      return store;
    }
    void fresh.then((late) => {
      if (late) lastGood = late;
    }, () => undefined);
  } catch (error) {
    console.warn("[partner-delivery-prefs] fresh read failed", error);
  }
  if (lastGood) return lastGood;
  try {
    return parseStore(await readFile(STORE, "utf8")) ?? {};
  } catch {
    return {};
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
  lastGood = data;
  const { clearSearchCatalog } = await import("@/lib/server/search-catalog");
  clearSearchCatalog();
}

/**
 * Change every partner's prefs in one step. The latest saved copy is re-read
 * inside the lock; when it cannot be read, nothing is written, so one partner's
 * save can never wipe the other partners' prices.
 */
async function mutateStore(update: (store: StoreFile) => boolean): Promise<void> {
  await withStoreLock(STORE, async () => {
    const raw = await readFileForUpdate(STORE);
    let store: StoreFile = {};
    if (raw != null) {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Saved delivery prices are unreadable. Nothing was changed.");
      }
      store = parsed as StoreFile;
    }
    if (update(store)) await writeStore(store);
  });
}

function cleanPref(raw: Partial<PartnerDeliveryPref>): PartnerDeliveryPref | null {
  const id = String(raw.deliveryLocationId || "").trim();
  if (!id) return null;
  const freeRaw = raw.freeAfterDays;
  const freeAfterDays =
    freeRaw == null || freeRaw === ("" as unknown) || Number.isNaN(Number(freeRaw))
      ? null
      : Math.max(0, Math.floor(Number(freeRaw)));
  return {
    deliveryLocationId: id,
    enabled: raw.enabled !== false,
    priceEur: Math.max(0, Number(Number(raw.priceEur) || 0)),
    freeAfterDays,
    travelTimeMinutes: Math.max(0, Math.floor(Number(raw.travelTimeMinutes) || 0)),
  };
}

export async function readPartnerDeliveryPrefs(partnerId: string): Promise<PartnerDeliveryPref[]> {
  const store = await readStore();
  const rows = store[partnerId];
  if (!Array.isArray(rows)) return [];
  return rows.map(cleanPref).filter((r): r is PartnerDeliveryPref => Boolean(r));
}

/**
 * Save the given locations' prices. Locations missing from `prefs` (for example a
 * place the admin switched off for a while) keep their saved price.
 */
export async function writePartnerDeliveryPrefs(
  partnerId: string,
  prefs: PartnerDeliveryPref[],
): Promise<PartnerDeliveryPref[]> {
  const cleaned = prefs.map(cleanPref).filter((r): r is PartnerDeliveryPref => Boolean(r));
  const submitted = new Set(cleaned.map((p) => p.deliveryLocationId));
  let merged = cleaned;
  await mutateStore((store) => {
    const previous = Array.isArray(store[partnerId]) ? store[partnerId] : [];
    const kept = previous
      .map(cleanPref)
      .filter((p): p is PartnerDeliveryPref => Boolean(p) && !submitted.has(p!.deliveryLocationId));
    merged = [...cleaned, ...kept];
    store[partnerId] = merged;
    return true;
  });
  return merged;
}

/** Add prefs for locations that have none yet. Saved prefs are never changed. */
export async function addMissingPartnerDeliveryPrefs(
  partnerId: string,
  prefs: PartnerDeliveryPref[],
): Promise<number> {
  const cleaned = prefs.map(cleanPref).filter((r): r is PartnerDeliveryPref => Boolean(r));
  if (!partnerId || !cleaned.length) return 0;
  let added = 0;
  await mutateStore((store) => {
    const previous = Array.isArray(store[partnerId]) ? store[partnerId] : [];
    const known = new Set(previous.map((p) => String(p?.deliveryLocationId || "").trim()));
    const fresh = cleaned.filter((p) => !known.has(p.deliveryLocationId));
    if (!fresh.length) return false;
    store[partnerId] = [...previous, ...fresh];
    added = fresh.length;
    return true;
  });
  return added;
}

/** Rewrite every partner's free-after days for one location down to the admin maximum. */
export async function clampAllPartnerFreeAfterDays(
  deliveryLocationId: string,
  maxFreeAfterDays: number,
): Promise<void> {
  const id = String(deliveryLocationId || "").trim();
  if (!id) return;
  await mutateStore((store) => {
    let changed = false;
    for (const partnerId of Object.keys(store)) {
      const rows = store[partnerId];
      if (!Array.isArray(rows)) continue;
      store[partnerId] = rows.map((raw) => {
        const pref = cleanPref(raw);
        if (!pref || pref.deliveryLocationId !== id) return raw;
        const { freeAfterDays, capped } = capFreeAfterDays(maxFreeAfterDays, pref.freeAfterDays);
        if (!capped) return pref;
        changed = true;
        return { ...pref, freeAfterDays };
      });
    }
    return changed;
  });
}

export async function readPartnerDeliveryPrefsMap(
  partnerIds: string[],
): Promise<Map<string, PartnerDeliveryPref[]>> {
  const store = await readStore();
  const map = new Map<string, PartnerDeliveryPref[]>();
  for (const id of partnerIds) {
    const rows = store[id];
    map.set(
      id,
      Array.isArray(rows)
        ? rows.map(cleanPref).filter((r): r is PartnerDeliveryPref => Boolean(r))
        : [],
    );
  }
  return map;
}
