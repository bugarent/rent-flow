import { dataRoot } from "@/lib/persistent-paths";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const STORE = join(dataRoot(), "booking-messages.json");

export type BookingMessage = {
  id: string;
  bookingId: string;
  author: "partner" | "customer" | "system";
  body: string;
  createdAt: string;
};

type StoreFile = { messages: BookingMessage[] };

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { messages: [] };
    const messages = Array.isArray((parsed as StoreFile).messages)
      ? (parsed as StoreFile).messages
      : [];
    return { messages };
  } catch {
    return { messages: [] };
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

export async function listBookingMessages(bookingId: string): Promise<BookingMessage[]> {
  const { messages } = await readStore();
  return messages
    .filter((m) => m.bookingId === bookingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addBookingMessage(input: {
  bookingId: string;
  author: BookingMessage["author"];
  body: string;
}): Promise<BookingMessage> {
  const body = String(input.body || "").trim();
  if (!body) throw new Error("Message required");
  const msg: BookingMessage = {
    id: randomUUID(),
    bookingId: input.bookingId,
    author: input.author,
    body,
    createdAt: new Date().toISOString(),
  };
  const data = await readStore();
  data.messages.push(msg);
  await writeStore(data);
  return msg;
}

export async function ensureSystemPaymentMessage(input: {
  bookingId: string;
  paidAt: string;
  amountLabel: string;
}): Promise<void> {
  const existing = await listBookingMessages(input.bookingId);
  if (existing.some((m) => m.author === "system" && m.body.includes("payment"))) return;
  const paidAt = new Date(input.paidAt);
  const when = Number.isNaN(paidAt.getTime())
    ? input.paidAt
    : paidAt.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
  await addBookingMessage({
    bookingId: input.bookingId,
    author: "system",
    body: `Site service fee payment recorded at ${when} (${input.amountLabel}).`,
  });
}
