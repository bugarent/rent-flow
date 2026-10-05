import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";

export type BookingMailConfig = {
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
};

const EMPTY: BookingMailConfig = {
  fromEmail: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
};

async function storePath() {
  return resolveDataFile("admin", "booking-mail-from.json");
}

function portOf(value: unknown, fallback: number) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;
  return port;
}

async function readStore(): Promise<BookingMailConfig> {
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<BookingMailConfig>;
    return {
      fromEmail: typeof parsed.fromEmail === "string" ? parsed.fromEmail.trim() : "",
      smtpHost: typeof parsed.smtpHost === "string" ? parsed.smtpHost.trim() : "",
      smtpPort: portOf(parsed.smtpPort, 587),
      smtpUser: typeof parsed.smtpUser === "string" ? parsed.smtpUser.trim() : "",
      smtpPass: typeof parsed.smtpPass === "string" ? parsed.smtpPass : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Sender mailbox for the booking notice that goes to the partner and the customer. */
export async function readBookingMailFrom(): Promise<string> {
  return (await readStore()).fromEmail;
}

export async function readBookingMailConfig(): Promise<BookingMailConfig> {
  return readStore();
}

export async function writeBookingMailConfig(
  patch: Partial<BookingMailConfig> & { fromEmail: string },
): Promise<BookingMailConfig> {
  const current = await readStore();
  const next: BookingMailConfig = {
    fromEmail: patch.fromEmail.trim(),
    smtpHost: (patch.smtpHost ?? current.smtpHost).trim(),
    smtpPort: portOf(patch.smtpPort, current.smtpPort || 587),
    smtpUser: (patch.smtpUser ?? current.smtpUser).trim(),
    smtpPass: patch.smtpPass && patch.smtpPass.length > 0 ? patch.smtpPass : current.smtpPass,
  };
  await ensureDataDir("admin");
  await writeFile(await storePath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
