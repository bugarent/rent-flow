import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, readFileForUpdate, withStoreLock, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import type { CrossBorderRoute } from "@/lib/delivery/cross-border-routes";

const STORE = join(dataRoot(), "partner-cross-border-routes.json");

type StoreFile = Record<string, CrossBorderRoute[]>;

let lastGood: StoreFile | null = null;

function newId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `cbr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cleanCrossBorderRoute(raw: unknown): CrossBorderRoute | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const pickupLocationId = String(row.pickupLocationId || "").trim();
  const returnLocationId = String(row.returnLocationId || "").trim();
  if (!pickupLocationId || !returnLocationId || pickupLocationId === returnLocationId) return null;
  const price = Number(row.priceEur);
  return {
    id: String(row.id || "").trim() || newId(),
    pickupLocationId,
    returnLocationId,
    priceEur: Number.isFinite(price) ? Math.max(0, Math.round(price * 100) / 100) : 0,
  };
}

function parseStore(raw: string | null): StoreFile | null {
  if (raw == null) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as StoreFile;
}

function routesOf(store: StoreFile, partnerId: string): CrossBorderRoute[] {
  const rows = store[partnerId];
  if (!Array.isArray(rows)) return [];
  return rows.map(cleanCrossBorderRoute).filter((row): row is CrossBorderRoute => Boolean(row));
}

async function readStore(): Promise<StoreFile> {
  try {
    const parsed = parseStore(await readFileForUpdate(STORE));
    if (parsed) {
      lastGood = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn("[cross-border-routes] fresh read failed", error);
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

export async function readPartnerCrossBorderRoutes(partnerId: string): Promise<CrossBorderRoute[]> {
  const store = await readStore();
  return routesOf(store, partnerId);
}

export async function readAllCrossBorderRoutes(): Promise<Map<string, CrossBorderRoute[]>> {
  const store = await readStore();
  const map = new Map<string, CrossBorderRoute[]>();
  for (const [partnerId, rows] of Object.entries(store)) {
    const cleaned = (Array.isArray(rows) ? rows : [])
      .map(cleanCrossBorderRoute)
      .filter((row): row is CrossBorderRoute => Boolean(row));
    if (cleaned.length) map.set(partnerId, cleaned);
  }
  return map;
}

/** Replace this partner's routes only. Other partners' routes stay as saved. */
export async function writePartnerCrossBorderRoutes(
  partnerId: string,
  routes: CrossBorderRoute[],
): Promise<CrossBorderRoute[]> {
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const next = routes
    .map(cleanCrossBorderRoute)
    .filter((row): row is CrossBorderRoute => Boolean(row))
    .slice(0, 40);
  let saved = next;
  await withStoreLock(STORE, async () => {
    const raw = await readFileForUpdate(STORE);
    let store: StoreFile = {};
    if (raw != null) {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Saved border-crossing routes are unreadable. Nothing was changed.");
      }
      store = parsed as StoreFile;
    }
    store[id] = next;
    saved = next;
    await writeStore(store);
  });
  return saved;
}
