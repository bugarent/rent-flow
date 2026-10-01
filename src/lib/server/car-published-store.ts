import { dataRoot } from "@/lib/persistent-paths";
import { readFile, writeFile, mkdir } from "@/lib/server/durable-fs";
import { join } from "node:path";

const SNAP_STORE = join(dataRoot(), "car-published-snapshots.json");
const CHANGES_STORE = join(dataRoot(), "car-pending-field-changes.json");

export type PublishedCarSnapshot = {
  title: string;
  description: string;
  dailyRateEur: number;
  discountPercent: number;
  make?: string;
  model?: string;
  year?: number | null;
  registrationNumber?: string;
  seats?: number | null;
  doors?: number | null;
  fuelType?: string;
  transmission?: string;
  photoUrls?: string[];
  passportFrontUrl?: string;
  passportBackUrl?: string;
  insuranceUrl?: string;
  at: string;
};

export type PublishedCarLiveInput = {
  title: string;
  description: string;
  dailyRateEur: number | string;
  discountPercent: number | string;
  make?: string;
  model?: string;
  year?: number | string | null;
  registrationNumber?: string;
  seats?: number | string | null;
  doors?: number | string | null;
  fuelType?: string;
  transmission?: string;
  photoUrls?: string[];
  passportFrontUrl?: string | null;
  passportBackUrl?: string | null;
  insuranceUrl?: string | null;
};

export type CarFieldChangeRecord = Record<string, { previous: string }>;

type SnapStoreFile = Record<string, PublishedCarSnapshot>;
type ChangesStoreFile = Record<string, CarFieldChangeRecord>;

async function readJsonFile<T extends object>(path: string): Promise<T | Record<string, never>> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as T;
  } catch {
    return {};
  }
}

async function writeJsonFile(path: string, data: unknown) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildSnapshot(live: PublishedCarLiveInput): PublishedCarSnapshot {
  return {
    title: live.title,
    description: live.description || "",
    dailyRateEur: Number(live.dailyRateEur) || 0,
    discountPercent: Number(live.discountPercent) || 0,
    make: live.make != null ? String(live.make) : "",
    model: live.model != null ? String(live.model) : "",
    year: toOptionalNumber(live.year),
    registrationNumber: live.registrationNumber != null ? String(live.registrationNumber) : "",
    seats: toOptionalNumber(live.seats),
    doors: toOptionalNumber(live.doors),
    fuelType: live.fuelType != null ? String(live.fuelType) : "",
    transmission: live.transmission != null ? String(live.transmission) : "",
    photoUrls: Array.isArray(live.photoUrls) ? live.photoUrls.map(String).filter(Boolean) : [],
    passportFrontUrl: live.passportFrontUrl != null ? String(live.passportFrontUrl) : "",
    passportBackUrl: live.passportBackUrl != null ? String(live.passportBackUrl) : "",
    insuranceUrl: live.insuranceUrl != null ? String(live.insuranceUrl) : "",
    at: new Date().toISOString(),
  };
}

export async function readPublishedCarSnapshot(carId: string): Promise<PublishedCarSnapshot | null> {
  const store = (await readJsonFile<SnapStoreFile>(SNAP_STORE)) as SnapStoreFile;
  return store[carId] || null;
}

/** Freeze the published (pre-edit) listing once — later partner edits keep this baseline. */
export async function ensurePublishedCarSnapshot(
  carId: string,
  live: PublishedCarLiveInput,
): Promise<PublishedCarSnapshot> {
  const store = (await readJsonFile<SnapStoreFile>(SNAP_STORE)) as SnapStoreFile;
  if (store[carId]) return store[carId];
  const snap = buildSnapshot(live);
  store[carId] = snap;
  await writeJsonFile(SNAP_STORE, store);
  return snap;
}

export async function clearPublishedCarSnapshot(carId: string) {
  const store = (await readJsonFile<SnapStoreFile>(SNAP_STORE)) as SnapStoreFile;
  if (!(carId in store)) {
    await clearCarFieldChanges(carId);
    return;
  }
  delete store[carId];
  await writeJsonFile(SNAP_STORE, store);
  await clearCarFieldChanges(carId);
}

export async function readCarFieldChanges(carId: string): Promise<CarFieldChangeRecord | null> {
  const store = (await readJsonFile<ChangesStoreFile>(CHANGES_STORE)) as ChangesStoreFile;
  const row = store[carId];
  if (!row || typeof row !== "object") return null;
  return row;
}

export async function writeCarFieldChanges(
  carId: string,
  changes: Map<string, { previous: string }> | CarFieldChangeRecord,
) {
  const store = (await readJsonFile<ChangesStoreFile>(CHANGES_STORE)) as ChangesStoreFile;
  const record: CarFieldChangeRecord =
    changes instanceof Map ? Object.fromEntries(changes.entries()) : { ...changes };
  if (Object.keys(record).length === 0) {
    if (carId in store) {
      delete store[carId];
      await writeJsonFile(CHANGES_STORE, store);
    }
    return;
  }
  store[carId] = record;
  await writeJsonFile(CHANGES_STORE, store);
}

export async function clearCarFieldChanges(carId: string) {
  const store = (await readJsonFile<ChangesStoreFile>(CHANGES_STORE)) as ChangesStoreFile;
  if (!(carId in store)) return;
  delete store[carId];
  await writeJsonFile(CHANGES_STORE, store);
}

/** True when a partner edit should enter re-moderation (vs first-time PENDING). */
export function shouldEnterListingRemoderation(status: string): boolean {
  return status === "APPROVED" || status === "PENDING_REMODERATION" || status === "REJECTED";
}

export function nextListingStatusAfterPartnerEdit(status: string): string {
  if (shouldEnterListingRemoderation(status)) return "PENDING_REMODERATION";
  if (status === "DRAFT") return "PENDING";
  return status === "PENDING" ? "PENDING" : status;
}

export function applyPublishedCarOverlay<
  T extends {
    id: string;
    status: string;
    title: string;
    description?: string;
    dailyRateEur: unknown;
    discountPercent?: unknown;
  },
>(car: T, snapshot: PublishedCarSnapshot | null | undefined): T {
  if (car.status !== "PENDING_REMODERATION" || !snapshot) return car;
  return {
    ...car,
    title: snapshot.title,
    description: snapshot.description,
    dailyRateEur: snapshot.dailyRateEur as T["dailyRateEur"],
    discountPercent: snapshot.discountPercent as T["discountPercent"],
  };
}
