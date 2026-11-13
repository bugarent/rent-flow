import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";

const STORE = join(dataRoot(), "partner-period-discounts.json");

export type PartnerPeriodDiscountKind = "discount" | "markup";

export type PartnerPeriodDiscount = {
  id: string;
  partnerId: string;
  title: string;
  /** Positive percent; discounts reduce price, markups increase. */
  percent: number;
  kind: PartnerPeriodDiscountKind;
  /** Inclusive MM-DD, repeats every year (may wrap past New Year, e.g. 12-20 → 01-10). */
  from: string;
  /** Inclusive MM-DD */
  to: string;
  carIds: string[];
  createdAt: string;
  updatedAt: string;
};

type StoreFile = { items: PartnerPeriodDiscount[] };

function emptyStore(): StoreFile {
  return { items: [] };
}

function toDay(value: string): string {
  const s = String(value || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return s;
}

function dayMs(isoDay: string): number {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** "MM-DD" from "MM-DD" or a dated "YYYY-MM-DD" (the year is dropped: periods repeat yearly). */
export function toMonthDay(value: string): string {
  const s = String(value || "").trim();
  const m = /^(?:\d{4}-)?(\d{1,2})-(\d{1,2})/.exec(s);
  if (!m) return "";
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > MONTH_DAYS[month - 1]) return "";
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function inYearlyWindow(md: string, fromMd: string, toMd: string): boolean {
  return fromMd <= toMd ? md >= fromMd && md <= toMd : md >= fromMd || md <= toMd;
}

/** Does any day of the rental (`YYYY-MM-DD` … `YYYY-MM-DD`) fall in the yearly MM-DD window? */
export function yearlyPeriodHitsRange(fromMd: string, toMd: string, rangeFrom: string, rangeTo: string): boolean {
  const f = toMonthDay(fromMd);
  const t = toMonthDay(toMd);
  const rf = toDay(rangeFrom);
  const rt = toDay(rangeTo);
  if (!f || !t || !rf || !rt) return false;
  const start = dayMs(rf);
  const end = Math.max(start, dayMs(rt));
  const DAY = 86_400_000;
  if (end - start >= 365 * DAY) return true;
  for (let ms = start; ms <= end; ms += DAY) {
    if (inYearlyWindow(new Date(ms).toISOString().slice(5, 10), f, t)) return true;
  }
  return false;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    const rows = Array.isArray((parsed as StoreFile).items) ? (parsed as StoreFile).items : [];
    // Older entries saved a full date; they now repeat every year on the same days.
    const items = rows.map((item) => ({
      ...item,
      from: toMonthDay(item.from) || item.from,
      to: toMonthDay(item.to) || item.to,
    }));
    return { items };
  } catch {
    return emptyStore();
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
  searchRead = { at: Date.now(), store: data };
}

/** Search pricing reads the store on every query; a 30s copy is enough there (writes refresh it). */
const SEARCH_READ_TTL_MS = 30_000;
let searchRead: { at: number; store: StoreFile } | null = null;

const SEARCH_READ_STALE_MS = 10 * 60_000;
let searchRefresh: Promise<StoreFile> | null = null;

async function readStoreForSearch(): Promise<StoreFile> {
  const age = searchRead ? Date.now() - searchRead.at : Infinity;
  if (searchRead && age < SEARCH_READ_TTL_MS) return searchRead.store;
  searchRefresh ??= readStore()
    .then((store) => {
      searchRead = { at: Date.now(), store };
      return store;
    })
    .finally(() => {
      searchRefresh = null;
    });
  // An older copy answers right away while the refresh runs.
  if (searchRead && age < SEARCH_READ_STALE_MS) {
    void searchRefresh.catch(() => undefined);
    return searchRead.store;
  }
  return searchRefresh;
}

function normalizeItem(raw: Partial<PartnerPeriodDiscount> & { partnerId: string }): PartnerPeriodDiscount | null {
  const from = toMonthDay(String(raw.from || ""));
  const to = toMonthDay(String(raw.to || ""));
  if (!from || !to) return null;
  const percent = Number(raw.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  const carIds = Array.isArray(raw.carIds)
    ? [...new Set(raw.carIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  if (!carIds.length) return null;
  const kind: PartnerPeriodDiscountKind = raw.kind === "markup" ? "markup" : "discount";
  const now = new Date().toISOString();
  return {
    id: String(raw.id || randomUUID()),
    partnerId: String(raw.partnerId),
    title: String(raw.title || "").trim() || (kind === "markup" ? "Markup" : "Discount"),
    percent: Number(percent.toFixed(2)),
    kind,
    from,
    to,
    carIds,
    createdAt: String(raw.createdAt || now),
    updatedAt: now,
  };
}

export async function listPeriodDiscountsForPartner(partnerId: string): Promise<PartnerPeriodDiscount[]> {
  const { items } = await readStore();
  return items
    .filter((i) => i.partnerId === partnerId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getPeriodDiscount(id: string): Promise<PartnerPeriodDiscount | null> {
  const { items } = await readStore();
  return items.find((i) => i.id === id) ?? null;
}

export async function createPeriodDiscount(input: {
  partnerId: string;
  title: string;
  percent: number;
  kind?: PartnerPeriodDiscountKind;
  from: string;
  to: string;
  carIds: string[];
}): Promise<PartnerPeriodDiscount> {
  const item = normalizeItem({ ...input, kind: input.kind || "discount" });
  if (!item) throw new Error("Invalid discount");
  const store = await readStore();
  store.items.push(item);
  await writeStore(store);
  return item;
}

export async function updatePeriodDiscount(
  id: string,
  partnerId: string,
  patch: {
    title?: string;
    percent?: number;
    kind?: PartnerPeriodDiscountKind;
    from?: string;
    to?: string;
    carIds?: string[];
  },
): Promise<PartnerPeriodDiscount | null> {
  const store = await readStore();
  const idx = store.items.findIndex((i) => i.id === id && i.partnerId === partnerId);
  if (idx < 0) return null;
  const prev = store.items[idx];
  const next = normalizeItem({
    ...prev,
    ...patch,
    id: prev.id,
    partnerId,
    createdAt: prev.createdAt,
  });
  if (!next) throw new Error("Invalid discount");
  store.items[idx] = next;
  await writeStore(store);
  return next;
}

export async function deletePeriodDiscount(id: string, partnerId: string): Promise<boolean> {
  const store = await readStore();
  const before = store.items.length;
  store.items = store.items.filter((i) => !(i.id === id && i.partnerId === partnerId));
  if (store.items.length === before) return false;
  await writeStore(store);
  return true;
}

/**
 * For each carId, the period adjustment for the rental: the strongest overlapping discount minus the
 * strongest overlapping markup. Positive = cheaper, negative = markup.
 */
export async function periodDiscountPercentByCarId(
  rangeFrom: string,
  rangeTo: string,
  carIds?: string[],
  opts?: { fresh?: boolean },
): Promise<Map<string, number>> {
  // Accept ISO datetimes from search (`2026-09-15T10:00`) as well as plain days.
  const from = toDay(rangeFrom) || toDay(new Date(rangeFrom).toISOString());
  const to =
    toDay(rangeTo || rangeFrom) ||
    toDay(new Date(rangeTo || rangeFrom).toISOString()) ||
    from;
  const map = new Map<string, number>();
  if (!from || !to) return map;

  const idFilter = carIds?.length ? new Set(carIds) : null;
  const { items } = opts?.fresh ? await readStore() : await readStoreForSearch();
  const discounts = new Map<string, number>();
  const markups = new Map<string, number>();
  for (const item of items) {
    if (!yearlyPeriodHitsRange(item.from, item.to, from, to)) continue;
    const target = item.kind === "markup" ? markups : discounts;
    for (const carId of item.carIds) {
      if (idFilter && !idFilter.has(carId)) continue;
      if (item.percent > (target.get(carId) ?? 0)) target.set(carId, item.percent);
    }
  }
  for (const carId of new Set([...discounts.keys(), ...markups.keys()])) {
    const net = (discounts.get(carId) ?? 0) - (markups.get(carId) ?? 0);
    if (net !== 0) map.set(carId, net);
  }
  return map;
}

/**
 * Listing price adjustment: the larger of the listing's own discount and a period discount,
 * or the listing discount minus a period markup. Positive = cheaper, negative = markup.
 */
export function mergeListingDiscountPercent(basePercent: number, periodPercent: number): number {
  const base = Number.isFinite(basePercent) ? Math.max(0, basePercent) : 0;
  const period = Number.isFinite(periodPercent) ? periodPercent : 0;
  const merged = period < 0 ? base + period : Math.max(base, period);
  return Math.min(100, Math.max(-100, merged));
}

/** Listing discount used when a booking is created, including an active period discount. */
export async function resolveListingDiscountPercent(input: {
  carId: string;
  basePercent: number;
  pickupDate: string;
  dropoffDate: string;
}): Promise<number> {
  try {
    const periodMap = await periodDiscountPercentByCarId(
      input.pickupDate,
      input.dropoffDate,
      [input.carId],
      { fresh: true },
    );
    return mergeListingDiscountPercent(input.basePercent, periodMap.get(input.carId) ?? 0);
  } catch {
    return mergeListingDiscountPercent(input.basePercent, 0);
  }
}
