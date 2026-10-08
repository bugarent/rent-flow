import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { capPartnerMaxPeriod, clampPartnerDailyPrice } from "@/lib/extras/pricing";

const STORE = join(dataRoot(), "partner-extras-prefs.json");

export type PartnerExtraPref = {
  extraServiceId: string;
  enabled: boolean;
  /** Partner marks service/territory as forbidden notice on listings */
  forbidden?: boolean;
  /** Daily price in EUR, capped to admin max on write */
  priceEur: number;
  /** Minimum charge for the rental when the customer selects this service. */
  minPeriodEur?: number | null;
  /** Maximum charge for the rental, no matter how many days are selected. */
  maxPeriodEur?: number | null;
  /**
   * Car IDs this pref applies to.
   * - omitted / undefined → all partner cars (legacy)
   * - array → only those cars
   */
  carIds?: string[];
};

type StoreFile = Record<string, PartnerExtraPref[]>;

/** Last successful read. A timed-out copy must not look like "no services enabled". */
let lastGoodStore: StoreFile | null = null;

function optionalStoredPeriod(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number(n.toFixed(2));
}

function cleanCarIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = [
    ...new Set(
      raw
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ];
  return ids;
}

/** Whether a pref should apply to a specific car listing. */
export function partnerExtraPrefAppliesToCar(
  pref: Pick<PartnerExtraPref, "carIds">,
  carId: string | null | undefined,
): boolean {
  const id = String(carId || "").trim();
  if (!id) return true;
  if (!pref.carIds) return true;
  return pref.carIds.includes(id);
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return lastGoodStore ?? {};
    }
    lastGoodStore = parsed as StoreFile;
    return lastGoodStore;
  } catch {
    return lastGoodStore ?? {};
  }
}

async function writeStore(data: StoreFile) {
  lastGoodStore = data;
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

/** Lower every partner's rental-maximum for one service to the admin period cap. */
export async function clampAllPartnerPeriodCaps(extraServiceId: string, adminMax: number): Promise<void> {
  const id = String(extraServiceId || "").trim();
  if (!id || !(adminMax > 0)) return;
  const store = await readStore();
  let changed = false;
  for (const partnerId of Object.keys(store)) {
    const rows = store[partnerId];
    if (!Array.isArray(rows)) continue;
    store[partnerId] = rows.map((pref) => {
      if (!pref || pref.extraServiceId !== id) return pref;
      const { maxPeriodEur, capped } = capPartnerMaxPeriod(adminMax, pref.maxPeriodEur);
      let minPeriodEur = optionalStoredPeriod(pref.minPeriodEur);
      const minLowered = minPeriodEur != null && maxPeriodEur != null && minPeriodEur > maxPeriodEur;
      if (minLowered) minPeriodEur = maxPeriodEur;
      if (!capped && !minLowered) return pref;
      changed = true;
      return { ...pref, maxPeriodEur, minPeriodEur };
    });
  }
  if (changed) await writeStore(store);
}

/** Pull every partner's daily price for one service into the admin min/max. */
export async function clampAllPartnerDailyPrices(
  extraServiceId: string,
  minPriceEur: number | null | undefined,
  maxPriceEur: number | null | undefined,
): Promise<void> {
  const id = String(extraServiceId || "").trim();
  if (!id) return;
  if (minPriceEur == null && maxPriceEur == null) return;
  const store = await readStore();
  let changed = false;
  for (const partnerId of Object.keys(store)) {
    const rows = store[partnerId];
    if (!Array.isArray(rows)) continue;
    store[partnerId] = rows.map((pref) => {
      if (!pref || pref.extraServiceId !== id || pref.forbidden) return pref;
      const priceEur = clampPartnerDailyPrice(minPriceEur, maxPriceEur, pref.priceEur);
      if (priceEur === Number(pref.priceEur)) return pref;
      changed = true;
      return { ...pref, priceEur };
    });
  }
  if (changed) await writeStore(store);
}

/** When admin sets period max to 0, every partner offer for that service becomes free. */
export async function forcePartnersFreeForExtra(extraServiceId: string): Promise<void> {
  const id = String(extraServiceId || "").trim();
  if (!id) return;
  const store = await readStore();
  let changed = false;
  for (const partnerId of Object.keys(store)) {
    const rows = store[partnerId];
    if (!Array.isArray(rows)) continue;
    store[partnerId] = rows.map((pref) => {
      if (!pref || pref.extraServiceId !== id || pref.forbidden) return pref;
      if (pref.priceEur === 0 && pref.minPeriodEur == null && pref.maxPeriodEur == null) return pref;
      changed = true;
      return { ...pref, priceEur: 0, minPeriodEur: null, maxPeriodEur: null };
    });
  }
  if (changed) await writeStore(store);
}

export async function readPartnerExtraPrefs(partnerId: string): Promise<PartnerExtraPref[]> {
  const store = await readStore();
  const rows = store[partnerId];
  return Array.isArray(rows) ? rows : [];
}

/** One file read for many partners (search hot path). */
export async function readPartnerExtraPrefsMap(
  partnerIds: string[],
): Promise<Map<string, PartnerExtraPref[]>> {
  const store = await readStore();
  const map = new Map<string, PartnerExtraPref[]>();
  for (const id of partnerIds) {
    const rows = store[id];
    map.set(id, Array.isArray(rows) ? rows : []);
  }
  return map;
}

export async function writePartnerExtraPrefs(
  partnerId: string,
  prefs: PartnerExtraPref[],
): Promise<PartnerExtraPref[]> {
  const cleaned = prefs
    .filter((p) => p && typeof p.extraServiceId === "string" && p.extraServiceId.trim())
    .map((p) => {
      const forbidden = Boolean(p.forbidden);
      const hasCarIds = Object.prototype.hasOwnProperty.call(p, "carIds");
      const carIds = hasCarIds ? cleanCarIds(p.carIds) ?? [] : undefined;
      return {
        extraServiceId: p.extraServiceId.trim(),
        // Forbidden notices stay attached; enabled means sellable when not forbidden.
        enabled: forbidden ? true : Boolean(p.enabled),
        forbidden,
        priceEur: forbidden
          ? 0
          : Number.isFinite(Number(p.priceEur))
            ? Math.max(0, Number(p.priceEur))
            : 0,
        minPeriodEur: forbidden ? null : optionalStoredPeriod(p.minPeriodEur),
        maxPeriodEur: forbidden ? null : optionalStoredPeriod(p.maxPeriodEur),
        // Always persist explicit arrays (including []) so "no cars" is not lost.
        ...(hasCarIds ? { carIds: carIds ?? [] } : {}),
      };
    });
  const store = await readStore();
  store[partnerId] = cleaned;
  await writeStore(store);
  return cleaned;
}

/** Enable or disable the catalog cross-border extra for all of a partner's cars. */
export async function setPartnerCrossBorderEnabled(
  partnerId: string,
  enabled: boolean,
  opts?: { carIds?: string[]; priceEur?: number },
): Promise<PartnerExtraPref[]> {
  const { CROSS_BORDER_EXTRA_ID } = await import("@/lib/extras/cross-border");
  const prefs = await readPartnerExtraPrefs(partnerId);
  const others = prefs.filter((p) => p.extraServiceId !== CROSS_BORDER_EXTRA_ID);
  const prev = prefs.find((p) => p.extraServiceId === CROSS_BORDER_EXTRA_ID);
  const next: PartnerExtraPref = {
    extraServiceId: CROSS_BORDER_EXTRA_ID,
    enabled: Boolean(enabled),
    forbidden: false,
    priceEur:
      opts?.priceEur != null
        ? Math.max(0, Number(opts.priceEur) || 0)
        : Number(prev?.priceEur) || 0,
    minPeriodEur: prev?.minPeriodEur ?? null,
    maxPeriodEur: prev?.maxPeriodEur ?? null,
    ...(opts?.carIds?.length
      ? { carIds: opts.carIds }
      : prev?.carIds?.length
        ? { carIds: prev.carIds }
        : {}),
  };
  return writePartnerExtraPrefs(partnerId, [...others, next]);
}

export async function isPartnerCrossBorderEnabled(partnerId: string): Promise<boolean> {
  const { CROSS_BORDER_EXTRA_ID } = await import("@/lib/extras/cross-border");
  const prefs = await readPartnerExtraPrefs(partnerId);
  const pref = prefs.find((p) => p.extraServiceId === CROSS_BORDER_EXTRA_ID);
  return Boolean(pref?.enabled) && !pref?.forbidden;
}
