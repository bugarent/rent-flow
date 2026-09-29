import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
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

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoreFile;
  } catch {
    return {};
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
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

export async function writePartnerDeliveryPrefs(
  partnerId: string,
  prefs: PartnerDeliveryPref[],
): Promise<PartnerDeliveryPref[]> {
  const cleaned = prefs.map(cleanPref).filter((r): r is PartnerDeliveryPref => Boolean(r));
  const store = await readStore();
  store[partnerId] = cleaned;
  await writeStore(store);
  return cleaned;
}

/** Rewrite every partner's free-after days for one location down to the admin maximum. */
export async function clampAllPartnerFreeAfterDays(
  deliveryLocationId: string,
  maxFreeAfterDays: number,
): Promise<void> {
  const id = String(deliveryLocationId || "").trim();
  if (!id) return;
  const store = await readStore();
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
  if (changed) await writeStore(store);
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
