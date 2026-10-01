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
  /** Inclusive YYYY-MM-DD */
  from: string;
  /** Inclusive YYYY-MM-DD */
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

export function periodDaysOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  const af = toDay(aFrom);
  const at = toDay(aTo);
  const bf = toDay(bFrom);
  const bt = toDay(bTo);
  if (!af || !at || !bf || !bt) return false;
  return dayMs(af) <= dayMs(bt) && dayMs(bf) <= dayMs(at);
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    const items = Array.isArray((parsed as StoreFile).items) ? (parsed as StoreFile).items : [];
    return { items };
  } catch {
    return emptyStore();
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

function normalizeItem(raw: Partial<PartnerPeriodDiscount> & { partnerId: string }): PartnerPeriodDiscount | null {
  const from = toDay(String(raw.from || ""));
  const to = toDay(String(raw.to || ""));
  if (!from || !to || dayMs(from) > dayMs(to)) return null;
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
 * For each carId, returns the strongest overlapping discount % (kind=discount only).
 * Markups are ignored for public search pricing for now.
 */
export async function periodDiscountPercentByCarId(
  rangeFrom: string,
  rangeTo: string,
  carIds?: string[],
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
  const { items } = await readStore();
  for (const item of items) {
    if (item.kind !== "discount") continue;
    if (!periodDaysOverlap(item.from, item.to, from, to)) continue;
    for (const carId of item.carIds) {
      if (idFilter && !idFilter.has(carId)) continue;
      const prev = map.get(carId) ?? 0;
      if (item.percent > prev) map.set(carId, item.percent);
    }
  }
  return map;
}

export function mergeListingDiscountPercent(basePercent: number, periodPercent: number): number {
  const base = Number.isFinite(basePercent) ? Math.max(0, basePercent) : 0;
  const period = Number.isFinite(periodPercent) ? Math.max(0, periodPercent) : 0;
  return Math.min(100, Math.max(base, period));
}

/** Listing discount used when a booking is created, including an active period discount. */
export async function resolveListingDiscountPercent(input: {
  carId: string;
  basePercent: number;
  pickupDate: string;
  dropoffDate: string;
}): Promise<number> {
  try {
    const periodMap = await periodDiscountPercentByCarId(input.pickupDate, input.dropoffDate, [
      input.carId,
    ]);
    return mergeListingDiscountPercent(input.basePercent, periodMap.get(input.carId) ?? 0);
  } catch {
    return mergeListingDiscountPercent(input.basePercent, 0);
  }
}
