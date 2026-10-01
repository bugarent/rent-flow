import "server-only";

import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

export type InvoiceShareRecord = {
  token: string;
  bookingId: string;
  createdAt: string;
  createdBy?: string;
};

type StoreFile = { shares: InvoiceShareRecord[] };

async function sharePath() {
  return resolveDataFile("invoices", "invoice-shares.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await sharePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { shares: Array.isArray(parsed.shares) ? (parsed.shares as InvoiceShareRecord[]) : [] };
  } catch {
    return { shares: [] };
  }
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("invoices");
  await writeFile(await sharePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function createInvoiceShare(input: {
  bookingId: string;
  createdBy?: string;
}): Promise<InvoiceShareRecord> {
  const bookingId = String(input.bookingId || "").trim();
  if (!bookingId) throw new Error("bookingId required");
  const store = await readStore();
  const existing = store.shares.find((s) => s.bookingId === bookingId);
  if (existing) return existing;
  const row: InvoiceShareRecord = {
    token: randomBytes(18).toString("base64url"),
    bookingId,
    createdAt: new Date().toISOString(),
    createdBy: String(input.createdBy || "").trim() || undefined,
  };
  store.shares.unshift(row);
  await writeStore(store);
  return row;
}

export async function getInvoiceShareByToken(
  token: string,
): Promise<InvoiceShareRecord | null> {
  const t = String(token || "").trim();
  if (!t) return null;
  const store = await readStore();
  return store.shares.find((s) => s.token === t) || null;
}

export async function getInvoiceShareByBookingId(
  bookingId: string,
): Promise<InvoiceShareRecord | null> {
  const id = String(bookingId || "").trim();
  if (!id) return null;
  const store = await readStore();
  return store.shares.find((s) => s.bookingId === id) || null;
}
