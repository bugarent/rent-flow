import { dataRoot } from "@/lib/persistent-paths";
import { readFile, writeFile, mkdir } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { computeBufferEndsAt } from "@/lib/calendar/buffer";

const STORE = join(dataRoot(), "car-calendar-blocks.json");

export type CarCalendarBlockMeta = {
  pickupCity?: string;
  dropoffCity?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupNote?: string;
  dropoffNote?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestLang?: string;
  messengers?: string[];
  altPhone?: string;
  dateOfBirth?: string;
  totalAmount?: string;
  payNow?: string;
  payOnPickup?: string;
  deposit?: string;
  agent?: string;
};

export type CarCalendarBlock = {
  id: string;
  carId: string;
  partnerId: string;
  from: string;
  to: string;
  label: string;
  source: "PARTNER" | "ADMIN";
  createdAt: string;
  meta?: CarCalendarBlockMeta;
};

type StoreFile = { blocks: CarCalendarBlock[] };

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { blocks: [] };
    const blocks = Array.isArray((parsed as StoreFile).blocks) ? (parsed as StoreFile).blocks : [];
    return { blocks };
  } catch {
    return { blocks: [] };
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

export async function listCalendarBlocksForCars(
  carIds: string[],
  rangeFrom: Date,
  rangeTo: Date,
): Promise<CarCalendarBlock[]> {
  if (!carIds.length) return [];
  const idSet = new Set(carIds);
  const { blocks } = await readStore();
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  return blocks.filter((b) => {
    if (!idSet.has(b.carId)) return false;
    const start = new Date(b.from).getTime();
    const end = new Date(b.to).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return start < toMs && end > fromMs;
  });
}

/**
 * Car IDs closed by a calendar block for [rangeFrom, rangeTo).
 * Block occupies [from, dropoff + prep buffer) so search cannot book into the prep window.
 */
export async function carIdsBlockedInRange(rangeFrom: Date, rangeTo: Date): Promise<Set<string>> {
  const { blocks } = await readStore();
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return new Set();
  const ids = new Set<string>();
  for (const b of blocks) {
    const start = new Date(b.from).getTime();
    const end = computeBufferEndsAt(new Date(b.to)).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start < toMs && end > fromMs) ids.add(b.carId);
  }
  return ids;
}

/** True if this car already has a calendar block overlapping [from, to). */
export async function carHasBlockConflict(
  carId: string,
  from: Date,
  to: Date,
  excludeBlockId?: string,
): Promise<boolean> {
  const { blocks } = await readStore();
  const fromMs = from.getTime();
  const toMs = computeBufferEndsAt(to).getTime();
  for (const b of blocks) {
    if (b.carId !== carId) continue;
    if (excludeBlockId && b.id === excludeBlockId) continue;
    const start = new Date(b.from).getTime();
    const end = computeBufferEndsAt(new Date(b.to)).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start < toMs && fromMs < end) return true;
  }
  return false;
}

export async function getCalendarBlock(id: string): Promise<CarCalendarBlock | null> {
  const { blocks } = await readStore();
  return blocks.find((b) => b.id === id) || null;
}

export async function createCalendarBlock(input: {
  carId: string;
  partnerId: string;
  from: string;
  to: string;
  label?: string;
  source?: "PARTNER" | "ADMIN";
  meta?: CarCalendarBlockMeta;
}): Promise<CarCalendarBlock> {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw new Error("Invalid date range");
  }
  if (await carHasBlockConflict(input.carId, from, to)) {
    throw new Error("Dates conflict with an existing calendar booking");
  }
  const block: CarCalendarBlock = {
    id: randomUUID(),
    carId: input.carId,
    partnerId: input.partnerId,
    from: from.toISOString(),
    to: to.toISOString(),
    label: (input.label || "Rental office").trim() || "Rental office",
    source: input.source || "PARTNER",
    createdAt: new Date().toISOString(),
    ...(input.meta ? { meta: input.meta } : {}),
  };
  const data = await readStore();
  data.blocks.push(block);
  await writeStore(data);
  return block;
}

export async function deleteCalendarBlock(id: string, partnerId?: string) {
  const data = await readStore();
  const next = data.blocks.filter((b) => {
    if (b.id !== id) return true;
    if (partnerId && b.partnerId !== partnerId) return true;
    return false;
  });
  const removed = next.length !== data.blocks.length;
  if (removed) await writeStore({ blocks: next });
  return removed;
}

export async function updateCalendarBlock(
  id: string,
  patch: {
    from?: string;
    to?: string;
    label?: string;
    meta?: CarCalendarBlockMeta;
  },
  partnerId?: string,
): Promise<CarCalendarBlock | null> {
  const data = await readStore();
  const idx = data.blocks.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const current = data.blocks[idx];
  if (partnerId && current.partnerId !== partnerId) return null;

  const nextFrom = patch.from ? new Date(patch.from) : new Date(current.from);
  const nextTo = patch.to ? new Date(patch.to) : new Date(current.to);
  if (Number.isNaN(nextFrom.getTime()) || Number.isNaN(nextTo.getTime()) || nextTo <= nextFrom) {
    throw new Error("Invalid date range");
  }
  if (await carHasBlockConflict(current.carId, nextFrom, nextTo, id)) {
    throw new Error("Dates conflict with an existing calendar booking");
  }

  const updated: CarCalendarBlock = {
    ...current,
    from: nextFrom.toISOString(),
    to: nextTo.toISOString(),
    label: patch.label != null ? patch.label.trim() || current.label : current.label,
    meta: patch.meta ? { ...current.meta, ...patch.meta } : current.meta,
  };
  data.blocks[idx] = updated;
  await writeStore(data);
  return updated;
}
