import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

async function storePath() {
  return resolveDataFile("admin", "partner-mail-from.json");
}

/** Mailbox the admin chose for messages to partners (empty = the site's default sender). */
export async function readPartnerMailFrom(): Promise<string> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as { fromEmail?: unknown };
    return typeof parsed.fromEmail === "string" ? parsed.fromEmail.trim() : "";
  } catch {
    return "";
  }
}

export async function writePartnerMailFrom(fromEmail: string): Promise<string> {
  const next = fromEmail.trim();
  await ensureDataDir("admin");
  await writeFile(await storePath(), JSON.stringify({ fromEmail: next }, null, 2), "utf8");
  return next;
}
