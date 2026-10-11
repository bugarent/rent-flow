import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";

const STORE = join(dataRoot(), "partner-cabinet-onboarding.json");

export type CabinetOnboarding = {
  enrolledAt: string;
  loginCount: number;
  /** Highest login number on which the partner opened Additional services. */
  extrasAckLogin: number;
  lastLoginAt: string | null;
};

type StoreFile = Record<string, CabinetOnboarding>;

const LOGIN_DEBOUNCE_MS = 15_000;

function emptyRow(now: string): CabinetOnboarding {
  return { enrolledAt: now, loginCount: 0, extrasAckLogin: 0, lastLoginAt: null };
}

/** First two cabinet logins, until Additional services is opened on that login. */
export function extrasGateActive(row: CabinetOnboarding | null | undefined): boolean {
  if (!row) return false;
  return row.loginCount >= 1 && row.loginCount <= 2 && row.extrasAckLogin < row.loginCount;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as StoreFile;
  } catch {
    return {};
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

/** New registrations only. Existing partners stay without a row and are never gated. */
export async function enrollPartnerCabinetOnboarding(partnerId: string): Promise<void> {
  const id = partnerId.trim();
  if (!id) return;
  const store = await readStore();
  if (store[id]) return;
  store[id] = emptyRow(new Date().toISOString());
  await writeStore(store);
}

export async function readPartnerCabinetOnboarding(
  partnerId: string,
): Promise<CabinetOnboarding | null> {
  const id = partnerId.trim();
  if (!id) return null;
  const store = await readStore();
  return store[id] ?? null;
}

export async function recordPartnerCabinetLogin(partnerId: string): Promise<CabinetOnboarding | null> {
  const id = partnerId.trim();
  if (!id) return null;
  const store = await readStore();
  const row = store[id];
  if (!row) return null;
  const now = Date.now();
  const last = row.lastLoginAt ? Date.parse(row.lastLoginAt) : 0;
  if (last && now - last < LOGIN_DEBOUNCE_MS) return row;
  const next: CabinetOnboarding = {
    ...row,
    loginCount: row.loginCount + 1,
    lastLoginAt: new Date(now).toISOString(),
  };
  store[id] = next;
  await writeStore(store);
  return next;
}

export async function acknowledgePartnerExtrasVisit(
  partnerId: string,
): Promise<CabinetOnboarding | null> {
  const id = partnerId.trim();
  if (!id) return null;
  const store = await readStore();
  const row = store[id];
  if (!row || row.extrasAckLogin >= row.loginCount) return row ?? null;
  const next: CabinetOnboarding = { ...row, extrasAckLogin: row.loginCount };
  store[id] = next;
  await writeStore(store);
  return next;
}
