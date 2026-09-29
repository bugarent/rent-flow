import { dataFile } from "@/lib/persistent-paths";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { hashSecret } from "@/lib/crypto";

export const TEST_PARTNER_EMAIL = "zzzzz@gmail.com";
export const TEST_PARTNER_PASSWORD = "55555";
export const LOCAL_PARTNER_ID = "local-partner";

export type LocalPartnerRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: "VENDOR";
  status: "ACTIVE";
  companyName: string;
  /** Unique portal code number (PRT-{n}); assigned once and kept. */
  sequentialNumber?: number | null;
};

const STORE_PATH = dataFile("partner-account.json");

function readStore(): LocalPartnerRecord | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as LocalPartnerRecord;
  } catch {
    return null;
  }
}

function writeStore(record: LocalPartnerRecord) {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(record, null, 2), "utf8");
  } catch {
    // Serverless hosts (Vercel) mount the app at read-only /var/task.
  }
}

export function loadLocalPartner(): LocalPartnerRecord | null {
  return readStore();
}

export function saveLocalPartner(
  patch: Partial<Pick<LocalPartnerRecord, "email" | "passwordHash" | "companyName" | "sequentialNumber">>,
): LocalPartnerRecord {
  const current = readStore();
  const record: LocalPartnerRecord = {
    id: current?.id ?? LOCAL_PARTNER_ID,
    email: patch.email ?? current?.email ?? TEST_PARTNER_EMAIL,
    passwordHash: patch.passwordHash ?? current?.passwordHash ?? hashSecret(TEST_PARTNER_PASSWORD),
    role: "VENDOR",
    status: "ACTIVE",
    companyName: patch.companyName ?? current?.companyName ?? "Test Fleet Partner",
    sequentialNumber:
      patch.sequentialNumber !== undefined
        ? patch.sequentialNumber
        : (current?.sequentialNumber ?? null),
  };
  writeStore(record);
  return record;
}

export function provisionLocalPartner(): LocalPartnerRecord {
  const current = readStore();
  if (current) return current;
  return saveLocalPartner({
    email: TEST_PARTNER_EMAIL,
    passwordHash: hashSecret(TEST_PARTNER_PASSWORD),
    companyName: "Test Fleet Partner",
  });
}
