import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

type Store = { fromEmail: string };

async function storePath() {
  return resolveDataFile("admin", "booking-mail-from.json");
}

/** Sender mailbox for the booking notice that goes to the partner and the customer. */
export async function readBookingMailFrom(): Promise<string> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return typeof parsed.fromEmail === "string" ? parsed.fromEmail.trim() : "";
  } catch {
    return "";
  }
}

export async function writeBookingMailFrom(fromEmail: string): Promise<void> {
  await ensureDataDir("admin");
  await writeFile(await storePath(), JSON.stringify({ fromEmail: fromEmail.trim() }, null, 2), "utf8");
}
