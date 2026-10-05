import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { randomUUID } from "node:crypto";
import {
  normalizeRefundChanges,
  summarizeRefundChanges,
  type RefundChangeDetail,
} from "@/lib/bookings/refund-change-details";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

async function refundsPath() {
  return resolveDataFile("bookings", "admin-booking-refunds.json");
}

export type BookingRefundStatus = "PENDING" | "REFUNDED" | "CANCELLED";

export type { RefundChangeDetail };

export type BookingRefundRecord = {
  id: string;
  bookingId: string;
  sequentialNumber: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  amountEur: number;
  depositPercent: number;
  reason: string;
  /** Structured change lines for admin UI (dates / cancelled extras). */
  changes?: RefundChangeDetail[];
  /** Payment channel hint (e.g. paypal sandbox / card). */
  paymentSource: string;
  status: BookingRefundStatus;
  /** False after admin opens the refunds inbox. */
  unreadByAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  refundedAt?: string;
  refundedBy?: string;
};

type StoreFile = { refunds: BookingRefundRecord[] };

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await refundsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { refunds: Array.isArray(parsed.refunds) ? (parsed.refunds as BookingRefundRecord[]) : [] };
  } catch {
    return { refunds: [] };
  }
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("bookings");
  await writeFile(await refundsPath(), JSON.stringify(store, null, 2), "utf8");
}

export async function createBookingRefund(
  input: Omit<BookingRefundRecord, "id" | "status" | "createdAt" | "updatedAt" | "refundedAt" | "refundedBy">,
): Promise<BookingRefundRecord> {
  const amountEur = Number(input.amountEur) || 0;
  if (amountEur <= 0) {
    throw new Error("Refund amount must be positive");
  }
  const changes = normalizeRefundChanges(input.changes);
  const reason =
    String(input.reason || "").trim() ||
    summarizeRefundChanges(changes) ||
    "Booking correction refund";
  const store = await readStore();
  const now = new Date().toISOString();
  const row: BookingRefundRecord = {
    ...input,
    id: randomUUID(),
    amountEur,
    reason,
    ...(changes.length ? { changes } : {}),
    status: "PENDING",
    unreadByAdmin: true,
    createdAt: now,
    updatedAt: now,
  };
  store.refunds.unshift(row);
  await writeStore(store);
  return row;
}

export async function listBookingRefunds(opts?: {
  status?: BookingRefundStatus;
}): Promise<BookingRefundRecord[]> {
  const store = await readStore();
  let rows = [...store.refunds];
  if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getBookingRefund(id: string): Promise<BookingRefundRecord | null> {
  const store = await readStore();
  return store.refunds.find((r) => r.id === id) || null;
}

export async function markBookingRefunded(
  id: string,
  refundedBy: string,
): Promise<BookingRefundRecord | null> {
  const store = await readStore();
  const idx = store.refunds.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const row = store.refunds[idx];
  if (row.status !== "PENDING") return row;
  const now = new Date().toISOString();
  const next: BookingRefundRecord = {
    ...row,
    status: "REFUNDED",
    unreadByAdmin: false,
    updatedAt: now,
    refundedAt: now,
    refundedBy: String(refundedBy || "admin").trim() || "admin",
  };
  store.refunds[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteBookingRefund(id: string): Promise<boolean> {
  const refundId = String(id || "").trim();
  if (!refundId) return false;
  const store = await readStore();
  const next = store.refunds.filter((r) => r.id !== refundId);
  if (next.length === store.refunds.length) return false;
  store.refunds = next;
  await writeStore(store);
  return true;
}

export async function getPendingRefundTotal(): Promise<number> {
  const store = await readStore();
  return store.refunds.filter((r) => r.status === "PENDING").length;
}

/** Pending refund invoices for a specific booking (admin booking modal). */
export async function listPendingRefundsForBooking(
  bookingId: string,
): Promise<BookingRefundRecord[]> {
  const id = String(bookingId || "").trim();
  if (!id) return [];
  const store = await readStore();
  return store.refunds
    .filter((r) => r.bookingId === id && r.status === "PENDING")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Pending refund invoices not yet opened by admin. */
export async function getRefundUnreadTotal(): Promise<number> {
  const store = await readStore();
  return store.refunds.filter(
    (r) => r.status === "PENDING" && r.unreadByAdmin !== false,
  ).length;
}

/** Mark all pending refund invoices as seen (clears yellow badge). */
export async function markAllRefundsRead(): Promise<number> {
  const store = await readStore();
  let changed = 0;
  const now = new Date().toISOString();
  store.refunds = store.refunds.map((r) => {
    if (r.status !== "PENDING" || r.unreadByAdmin === false) return r;
    changed += 1;
    return { ...r, unreadByAdmin: false, updatedAt: now };
  });
  if (changed) await writeStore(store);
  return changed;
}
