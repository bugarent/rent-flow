import { dataRoot } from "@/lib/persistent-paths";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const STORE = join(dataRoot(), "car-rejection-notices.json");

export type CarRejectionNotice = {
  note: string;
  at: string;
  unread: boolean;
};

type StoreFile = Record<string, CarRejectionNotice>;

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

export async function writeCarRejectionNotice(carId: string, note: string) {
  const data = await readStore();
  data[carId] = {
    note: String(note || "").trim(),
    at: new Date().toISOString(),
    unread: true,
  };
  await writeStore(data);
  return data[carId];
}

export async function readCarRejectionNotice(carId: string): Promise<CarRejectionNotice | null> {
  const data = await readStore();
  return data[carId] ?? null;
}

export async function readCarRejectionNotices(carIds: string[]): Promise<Map<string, CarRejectionNotice>> {
  const data = await readStore();
  const map = new Map<string, CarRejectionNotice>();
  for (const id of carIds) {
    if (data[id]) map.set(id, data[id]);
  }
  return map;
}

export async function acknowledgeCarRejectionNotice(carId: string) {
  const data = await readStore();
  const existing = data[carId];
  if (!existing) return null;
  data[carId] = { ...existing, unread: false };
  await writeStore(data);
  return data[carId];
}

export async function clearCarRejectionNotice(carId: string) {
  const data = await readStore();
  if (!data[carId]) return;
  delete data[carId];
  await writeStore(data);
}
