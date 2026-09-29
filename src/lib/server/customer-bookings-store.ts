import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { BOOKING_REF_START } from "@/lib/ids";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

async function bookingsPath() {
  return resolveDataFile("bookings", "customer-bookings.json");
}

export type FileBookingExtra = {
  id: string;
  label: string;
  priceEur: number;
  qty?: number;
};

export type FileBookingRecord = {
  id: string;
  sequentialNumber: number;
  carId: string;
  customerId: string;
  pickupAirportIata: string;
  dropoffAirportIata: string;
  pickupAt: string;
  dropoffAt: string;
  bufferEndsAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  flightNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "UNFULFILLED";
  /** Guest's written reason, set when they cancel. */
  cancellationReason?: string;
  cancelledAt?: string;
  totalPriceEur: number;
  depositPercent: number;
  depositPaidEur: number;
  balanceDueEur: number;
  guestFirstName: string;
  guestLastName: string;
  guestPhone: string;
  guestEmail: string;
  guestMessenger: string;
  /** Every messenger the guest checked. First one is also guestMessenger. */
  guestMessengers?: string[];
  dateOfBirth?: string;
  /** ISO 3166-1 alpha-2 country the driver lives in. */
  countryOfResidence?: string;
  promoCode?: string;
  extras?: FileBookingExtra[];
  /** Guest-requested changes awaiting admin confirmation */
  pendingChanges?: {
    pickupAt?: string;
    dropoffAt?: string;
    pickupAirportIata?: string;
    dropoffAirportIata?: string;
    pickupAddress?: string;
    dropoffAddress?: string;
    extras?: FileBookingExtra[];
    extrasPayNowEur?: number;
    note?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  fileStored: true;
};

type StoreFile = { bookings: FileBookingRecord[]; nextSequential: number };

async function readStoreFile(): Promise<StoreFile> {
  try {
    const raw = await readFile(await bookingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      bookings: Array.isArray(parsed.bookings) ? (parsed.bookings as FileBookingRecord[]) : [],
      nextSequential:
        typeof parsed.nextSequential === "number" && parsed.nextSequential >= BOOKING_REF_START
          ? parsed.nextSequential
          : BOOKING_REF_START,
    };
  } catch {
    return { bookings: [], nextSequential: BOOKING_REF_START };
  }
}

let reconcilingMoney = false;

async function readStore(): Promise<StoreFile> {
  const store = await readStoreFile();
  if (reconcilingMoney) return store;
  reconcilingMoney = true;
  try {
    const { applyCanonicalMoney } = await import("@/lib/server/bookings/apply-canonical-money");
    const changed = await applyCanonicalMoney(store.bookings);
    if (changed) await writeStore(store);
  } catch (error) {
    console.warn("[bookings] canonical money", error);
  } finally {
    reconcilingMoney = false;
  }
  return store;
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("bookings");
  await writeFile(await bookingsPath(), JSON.stringify(store, null, 2), "utf8");
}

export async function createFileBooking(
  input: Omit<FileBookingRecord, "id" | "sequentialNumber" | "createdAt" | "updatedAt" | "fileStored" | "status"> & {
    status?: FileBookingRecord["status"];
  },
): Promise<FileBookingRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const sequentialNumber = store.nextSequential;
  const row: FileBookingRecord = {
    ...input,
    id: randomUUID(),
    sequentialNumber,
    status: input.status || "PENDING",
    createdAt: now,
    updatedAt: now,
    fileStored: true,
  };
  store.bookings.unshift(row);
  store.nextSequential = sequentialNumber + 1;
  await writeStore(store);
  return row;
}

export async function listFileBookingsForCustomer(customerId: string): Promise<FileBookingRecord[]> {
  const store = await readStore();
  return store.bookings.filter((b) => b.customerId === customerId);
}

export async function listFileBookingsForCars(
  carIds: string[],
  rangeFrom: Date,
  rangeTo: Date,
  opts?: { includeCancelled?: boolean },
): Promise<FileBookingRecord[]> {
  if (!carIds.length) return [];
  const idSet = new Set(carIds);
  const store = await readStore();
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  const includeCancelled = opts?.includeCancelled === true;
  return store.bookings.filter((b) => {
    if (!idSet.has(b.carId)) return false;
    if (!includeCancelled && (b.status === "CANCELLED" || b.status === "UNFULFILLED")) return false;
    const pickup = new Date(b.pickupAt).getTime();
    const buffer = new Date(b.bufferEndsAt || b.dropoffAt).getTime();
    return pickup < toMs && buffer > fromMs;
  });
}

export async function listAllFileBookings(): Promise<FileBookingRecord[]> {
  const store = await readStore();
  return [...store.bookings];
}

export async function getFileBooking(id: string): Promise<FileBookingRecord | null> {
  const store = await readStore();
  return store.bookings.find((b) => b.id === id) || null;
}

export async function listFileBookingsByEmail(email: string): Promise<FileBookingRecord[]> {
  const store = await readStore();
  const mail = email.trim().toLowerCase();
  if (!mail) return [];
  return store.bookings.filter((b) => String(b.guestEmail || "").trim().toLowerCase() === mail);
}

export async function deleteFileBookings(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const store = await readStore();
  const drop = new Set(ids);
  const before = store.bookings.length;
  store.bookings = store.bookings.filter((b) => !drop.has(b.id));
  const removed = before - store.bookings.length;
  if (removed > 0) await writeStore(store);
  return removed;
}

export async function findFileBookingByRefAndEmail(
  sequentialNumber: number,
  email: string,
): Promise<FileBookingRecord | null> {
  const store = await readStore();
  const mail = email.trim().toLowerCase();
  return (
    store.bookings.find(
      (b) =>
        b.sequentialNumber === sequentialNumber &&
        String(b.guestEmail || "").trim().toLowerCase() === mail,
    ) || null
  );
}

/** Next booking number that would be assigned — does not consume it. */
export async function peekNextFileBookingSequential(): Promise<number> {
  const store = await readStoreFile();
  return Math.max(BOOKING_REF_START, store.nextSequential || BOOKING_REF_START);
}

export async function updateFileBooking(
  id: string,
  patch: Partial<
    Pick<
      FileBookingRecord,
      | "guestFirstName"
      | "guestLastName"
      | "guestEmail"
      | "guestPhone"
      | "pickupAt"
      | "dropoffAt"
      | "bufferEndsAt"
      | "pickupAirportIata"
      | "dropoffAirportIata"
      | "pickupAddress"
      | "dropoffAddress"
      | "totalPriceEur"
      | "depositPaidEur"
      | "balanceDueEur"
      | "depositPercent"
      | "status"
      | "cancellationReason"
      | "cancelledAt"
      | "flightNumber"
      | "extras"
      | "pendingChanges"
    >
  >,
): Promise<FileBookingRecord | null> {
  const store = await readStore();
  const idx = store.bookings.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const next: FileBookingRecord = {
    ...store.bookings[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.bookings[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteFileBooking(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.bookings.length;
  store.bookings = store.bookings.filter((b) => b.id !== id);
  if (store.bookings.length === before) return false;
  await writeStore(store);
  return true;
}
