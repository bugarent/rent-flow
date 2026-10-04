import { dataRoot } from "@/lib/persistent-paths";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";

const STORE = join(dataRoot(), "car-insurance-docs.json");

export type CarInsuranceDoc = {
  insuranceUrl: string;
  /** Inclusive last valid day as YYYY-MM-DD (local calendar). */
  insuranceExpiresAt?: string;
  /**
   * Expiry day an admin already approved. Auto-remoderation skips this exact day
   * so confirming a listing does not immediately send it back to the queue.
   */
  insuranceExpiryAcknowledgedAt?: string;
};

type StoreFile = Record<string, CarInsuranceDoc>;

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

/** YYYY-MM-DD or null. */
export function normalizeInsuranceExpiresAt(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const isoDay = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return null;
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return isoDay;
}

export function todayYyyyMmDd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when expiry day has arrived or passed (inclusive). */
export function isInsuranceExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  const day = normalizeInsuranceExpiresAt(expiresAt);
  if (!day) return false;
  return day <= todayYyyyMmDd(now);
}

export async function readCarInsuranceDoc(carId: string): Promise<CarInsuranceDoc | null> {
  const store = await readStore();
  const row = store[carId];
  if (!row) return null;
  const url = row.insuranceUrl?.trim() || "";
  const expires = normalizeInsuranceExpiresAt(row.insuranceExpiresAt) || undefined;
  if (!url && !expires) return null;
  return { insuranceUrl: url, ...(expires ? { insuranceExpiresAt: expires } : {}) };
}

export async function readCarInsuranceUrl(carId: string): Promise<string | null> {
  const doc = await readCarInsuranceDoc(carId);
  const url = doc?.insuranceUrl?.trim();
  return url || null;
}

export async function readCarInsuranceExpiresAt(carId: string): Promise<string | null> {
  const doc = await readCarInsuranceDoc(carId);
  return normalizeInsuranceExpiresAt(doc?.insuranceExpiresAt);
}

export async function readCarInsuranceUrls(carIds: string[]): Promise<Map<string, string>> {
  const store = await readStore();
  const map = new Map<string, string>();
  for (const id of carIds) {
    const url = store[id]?.insuranceUrl?.trim();
    if (url) map.set(id, url);
  }
  return map;
}

export async function readCarInsuranceDocs(carIds: string[]): Promise<Map<string, CarInsuranceDoc>> {
  const store = await readStore();
  const map = new Map<string, CarInsuranceDoc>();
  for (const id of carIds) {
    const row = store[id];
    if (!row) continue;
    const url = row.insuranceUrl?.trim() || "";
    const expires = normalizeInsuranceExpiresAt(row.insuranceExpiresAt) || undefined;
    if (!url && !expires) continue;
    map.set(id, { insuranceUrl: url, ...(expires ? { insuranceExpiresAt: expires } : {}) });
  }
  return map;
}

/** True when this expiry day should pull an approved listing back into moderation. */
export function insuranceExpiryNeedsRemoderation(
  row: { insuranceExpiresAt?: string | null; insuranceExpiryAcknowledgedAt?: string | null },
  now = new Date(),
): boolean {
  const day = normalizeInsuranceExpiresAt(row.insuranceExpiresAt);
  if (!day || !isInsuranceExpired(day, now)) return false;
  const acknowledged = normalizeInsuranceExpiresAt(row.insuranceExpiryAcknowledgedAt);
  return acknowledged !== day;
}

/** All car ids whose insurance expiry day has arrived and was not already admin-approved. */
export async function listExpiredInsuranceCarIds(now = new Date()): Promise<string[]> {
  const store = await readStore();
  const ids: string[] = [];
  for (const [id, row] of Object.entries(store)) {
    if (insuranceExpiryNeedsRemoderation(row, now)) ids.push(id);
  }
  return ids;
}

/**
 * Remember that an admin approved the listing against the current expiry.
 * A still-valid date clears any previous acknowledgement so a future expiry can re-queue it.
 */
export async function acknowledgeReviewedInsuranceExpiry(carId: string, now = new Date()): Promise<void> {
  const store = await readStore();
  const row = store[carId];
  if (!row) return;
  const day = normalizeInsuranceExpiresAt(row.insuranceExpiresAt);
  if (day && isInsuranceExpired(day, now)) {
    if (row.insuranceExpiryAcknowledgedAt === day) return;
    row.insuranceExpiryAcknowledgedAt = day;
  } else if (row.insuranceExpiryAcknowledgedAt) {
    delete row.insuranceExpiryAcknowledgedAt;
  } else {
    return;
  }
  store[carId] = row;
  await writeStore(store);
}

export async function writeCarInsuranceDoc(
  carId: string,
  patch: { insuranceUrl?: string | null; insuranceExpiresAt?: string | null },
): Promise<void> {
  const store = await readStore();
  const prev = store[carId] || { insuranceUrl: "" };
  const next: CarInsuranceDoc = { insuranceUrl: prev.insuranceUrl || "" };
  if (prev.insuranceExpiresAt) next.insuranceExpiresAt = prev.insuranceExpiresAt;
  if (prev.insuranceExpiryAcknowledgedAt) {
    next.insuranceExpiryAcknowledgedAt = prev.insuranceExpiryAcknowledgedAt;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "insuranceUrl")) {
    next.insuranceUrl = patch.insuranceUrl?.trim() || "";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "insuranceExpiresAt")) {
    const day = normalizeInsuranceExpiresAt(patch.insuranceExpiresAt);
    if (day) {
      next.insuranceExpiresAt = day;
      if (next.insuranceExpiryAcknowledgedAt && next.insuranceExpiryAcknowledgedAt !== day) {
        delete next.insuranceExpiryAcknowledgedAt;
      }
    } else {
      delete next.insuranceExpiresAt;
      delete next.insuranceExpiryAcknowledgedAt;
    }
  }

  if (!next.insuranceUrl && !next.insuranceExpiresAt) {
    delete store[carId];
  } else {
    store[carId] = next;
  }
  await writeStore(store);
}

export async function writeCarInsuranceUrl(carId: string, insuranceUrl: string | null): Promise<void> {
  await writeCarInsuranceDoc(carId, { insuranceUrl });
}

export function normalizeInsuranceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return url || null;
}
