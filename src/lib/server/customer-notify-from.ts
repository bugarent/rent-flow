import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

type Store = { fromEmail: string };

async function storePath() {
  return resolveDataFile("admin", "customer-notify-from.json");
}

/** Saved sender address for customer notices on the partners page. */
export async function readCustomerNotifyFrom(): Promise<string> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return typeof parsed.fromEmail === "string" ? parsed.fromEmail.trim() : "";
  } catch {
    return "";
  }
}

export async function writeCustomerNotifyFrom(fromEmail: string): Promise<void> {
  await ensureDataDir("admin");
  await writeFile(await storePath(), JSON.stringify({ fromEmail: fromEmail.trim() }, null, 2), "utf8");
}
