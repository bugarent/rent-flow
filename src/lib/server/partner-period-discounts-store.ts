import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { rentalDayCount } from "@/lib/cars/reserve-pricing";

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

const DAY_MS = 86_400_000;
const MAX_PRICED_DAYS = 366;

/**
 * Calendar day (MM-DD) of each charged rental day: day 1 is the pickup date, then one per 24h,
 * the same count the price uses. No return date = one day.
 */
export function rentalMonthDays(rangeFrom: string, rangeTo?: string): string[] {
  const first = toDay(rangeFrom) || (Number.isNaN(Date.parse(rangeFrom)) ? "" : toDay(new Date(rangeFrom).toISOString()));
  if (!first) return [];
  const days = rangeTo ? Math.min(MAX_PRICED_DAYS, rentalDayCount(rangeFrom, rangeTo)) : 1;
  const start = dayMs(first);
  return Array.from({ length: days }, (_, i) => new Date(start + i * DAY_MS).toISOString().slice(5, 10));
}

/** Is this day (MM-DD) inside the yearly MM-DD window? Both ends count. */
export function dayInYearlyPeriod(md: string, fromMd: string, toMd: string): boolean {
  const f = toMonthDay(fromMd);
  const t = toMonthDay(toMd);
  if (!f || !t || !md) return false;
  return inYearlyWindow(md, f, t);
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

/** A partner's new period must reach search quickly; an older copy answers at most this long. */
const SEARCH_READ_STALE_MS = 60_000;
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

/** Per charged rental day: the day's period adjustment in percent. Positive = cheaper, negative = markup. */
export type PeriodDayAdjustments = number[];

/**
 * For each car with a discount or markup on any rental day, that adjustment day by day:
 * the strongest discount covering the day minus the strongest markup covering it, 0 outside every period.
 * A 10-day rental whose discount starts on day 6 is five 0s then five discounted days.
 */
export async function periodDiscountPercentByCarId(
  rangeFrom: string,
  rangeTo: string,
  carIds?: string[],
  opts?: { fresh?: boolean },
): Promise<Map<string, PeriodDayAdjustments>> {
  const map = new Map<string, PeriodDayAdjustments>();
  const days = rentalMonthDays(rangeFrom, rangeTo);
  if (!days.length) return map;

  const idFilter = carIds?.length ? new Set(carIds) : null;
  const { items } = opts?.fresh ? await readStore() : await readStoreForSearch();
  const discounts = new Map<string, number[]>();
  const markups = new Map<string, number[]>();
  for (const item of items) {
    const covered = days.map((md) => dayInYearlyPeriod(md, item.from, item.to));
    if (!covered.some(Boolean)) continue;
    const target = item.kind === "markup" ? markups : discounts;
    for (const carId of item.carIds) {
      if (idFilter && !idFilter.has(carId)) continue;
      const row = target.get(carId) ?? days.map(() => 0);
      covered.forEach((hit, i) => {
        if (hit && item.percent > row[i]) row[i] = item.percent;
      });
      target.set(carId, row);
    }
  }
  for (const carId of new Set([...discounts.keys(), ...markups.keys()])) {
    const off = discounts.get(carId);
    const up = markups.get(carId);
    const net = days.map((_, i) => (off?.[i] ?? 0) - (up?.[i] ?? 0));
    if (net.some((value) => value !== 0)) map.set(carId, net);
  }
  return map;
}

function mergeDay(base: number, period: number): number {
  const merged = period < 0 ? base + period : Math.max(base, period);
  return Math.min(100, Math.max(-100, merged));
}

/**
 * Listing price adjustment for the whole rental, as one percent off the normal daily price:
 * each day takes the larger of the listing's own discount and that day's period discount,
 * or the listing discount minus that day's markup; the result is the average over the days,
 * so the rental total equals the sum of the day-by-day prices. Positive = cheaper, negative = markup.
 */
export function mergeListingDiscountPercent(
  basePercent: number,
  period: number | PeriodDayAdjustments,
): number {
  const base = Number.isFinite(basePercent) ? Math.max(0, basePercent) : 0;
  const days = Array.isArray(period) ? period : [period];
  if (!days.length) return mergeDay(base, 0);
  const sum = days.reduce<number>(
    (total, value) => total + mergeDay(base, Number.isFinite(value) ? value : 0),
    0,
  );
  return Math.round((sum / days.length) * 10_000) / 10_000;
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
