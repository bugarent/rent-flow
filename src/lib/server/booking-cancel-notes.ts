import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

type Note = { reason: string; cancelledAt: string };
type StoreFile = { notes: Record<string, Note> };

async function notesPath() {
  return resolveDataFile("bookings", "booking-cancel-notes.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(await notesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const notes =
      parsed.notes && typeof parsed.notes === "object" ? (parsed.notes as Record<string, Note>) : {};
    return { notes };
  } catch {
    return { notes: {} };
  }
}

async function writeStore(store: StoreFile) {
  await ensureDataDir("bookings");
  await writeFile(await notesPath(), JSON.stringify(store, null, 2), "utf8");
}

export async function saveBookingCancelNote(bookingId: string, reason: string) {
  const id = bookingId.trim();
  const text = reason.trim();
  if (!id || !text) return;
  const store = await readStore();
  store.notes[id] = { reason: text, cancelledAt: new Date().toISOString() };
  await writeStore(store);
}

export async function readBookingCancelNote(bookingId: string): Promise<string> {
  const store = await readStore();
  return String(store.notes[bookingId]?.reason || "").trim();
}
