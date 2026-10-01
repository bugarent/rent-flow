import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeLogin } from "@/lib/crypto";

const STORE = join(dataRoot(), "customer-bans.json");

export type CustomerBanRecord = {
  id: string;
  email: string;
  phoneDigits: string;
  phoneDisplay: string;
  reason: string;
  customerId: string | null;
  createdAt: string;
};

type StoreFile = { bans: CustomerBanRecord[] };

function phoneDigits(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { bans: Array.isArray(parsed.bans) ? (parsed.bans as CustomerBanRecord[]) : [] };
  } catch {
    return { bans: [] };
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

export async function listCustomerBans(): Promise<CustomerBanRecord[]> {
  return (await readStore()).bans;
}

export async function isCustomerContactBanned(opts: {
  email?: string | null;
  phone?: string | null;
}): Promise<CustomerBanRecord | null> {
  const email = normalizeLogin(opts.email || "");
  const digits = phoneDigits(opts.phone || "");
  if (!email && !digits) return null;
  const { bans } = await readStore();
  return (
    bans.find((b) => (email && b.email === email) || (digits.length >= 8 && b.phoneDigits === digits)) ||
    null
  );
}

export async function upsertCustomerBan(input: {
  email: string;
  phone: string;
  reason?: string;
  customerId?: string | null;
}): Promise<CustomerBanRecord> {
  const email = normalizeLogin(input.email);
  const digits = phoneDigits(input.phone);
  if (!email && !digits) {
    throw new Error("Email or phone required to block");
  }
  const store = await readStore();
  const existing = store.bans.findIndex(
    (b) => (email && b.email === email) || (digits && b.phoneDigits === digits),
  );
  const row: CustomerBanRecord = {
    id: existing >= 0 ? store.bans[existing].id : randomUUID(),
    email: email || (existing >= 0 ? store.bans[existing].email : ""),
    phoneDigits: digits || (existing >= 0 ? store.bans[existing].phoneDigits : ""),
    phoneDisplay: String(input.phone || "").trim(),
    reason: (input.reason || "Blocked by admin").trim(),
    customerId: input.customerId ?? null,
    createdAt: existing >= 0 ? store.bans[existing].createdAt : new Date().toISOString(),
  };
  if (existing >= 0) store.bans[existing] = row;
  else store.bans.unshift(row);
  await writeStore(store);
  return row;
}

export async function removeCustomerBan(opts: {
  email?: string | null;
  phone?: string | null;
  banId?: string | null;
}): Promise<boolean> {
  const email = normalizeLogin(opts.email || "");
  const digits = phoneDigits(opts.phone || "");
  const store = await readStore();
  const before = store.bans.length;
  store.bans = store.bans.filter((b) => {
    if (opts.banId && b.id === opts.banId) return false;
    if (email && b.email === email) return false;
    if (digits && b.phoneDigits === digits) return false;
    return true;
  });
  if (store.bans.length === before) return false;
  await writeStore(store);
  return true;
}
