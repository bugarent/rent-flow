import { dataFile } from "@/lib/persistent-paths";
import { existsSync, mkdir, mkdirSync, readDurableText, readFileSync, writeFile, writeFileSync } from "@/lib/server/durable-fs";
import { dirname } from "node:path";
import { hashSecret, verifySecret } from "@/lib/crypto";

export const TEST_ADMIN_EMAIL = "bugarent22@gmail.com";
export const LOCAL_ADMIN_ID = "local-admin";

/** Bootstrap admin password from the environment; empty means "never provision or reset". */
export function bootstrapAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "").trim();
}

export type LocalAdminRecord = {
  id: string;
  email: string;
  passwordHash: string;
  /** Shown on the admin parameters page. Kept only for this local account. */
  passwordPlain?: string;
  role: "ADMIN";
  status: "ACTIVE";
};

const STORE_PATH = dataFile("admin-account.json");
const LEGACY_EMAILS = new Set([
  "aaaaaaaaaa",
  "admin@rentairportcars.com",
  "aaaaa@gmail.com",
]);

function readStore(): LocalAdminRecord | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as LocalAdminRecord;
  } catch {
    return null;
  }
}

function writeStore(record: LocalAdminRecord) {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(record, null, 2), "utf8");
  } catch {
    // Serverless hosts (Vercel) mount the app at read-only /var/task.
    // Login must continue and check the database user.
  }
}

function recordFromPatch(
  current: LocalAdminRecord | null,
  patch: Partial<Pick<LocalAdminRecord, "email" | "passwordHash" | "passwordPlain">>,
): LocalAdminRecord {
  const bootstrap = bootstrapAdminPassword();
  return {
    id: current?.id ?? LOCAL_ADMIN_ID,
    email: patch.email ?? current?.email ?? TEST_ADMIN_EMAIL,
    passwordHash:
      patch.passwordHash ?? current?.passwordHash ?? (bootstrap ? hashSecret(bootstrap) : ""),
    passwordPlain:
      patch.passwordPlain !== undefined ? patch.passwordPlain : current?.passwordPlain,
    role: "ADMIN",
    status: "ACTIVE",
  };
}

/** Reads the admin login mirror from Postgres when the local file is gone. */
export async function loadLocalAdminAsync(): Promise<LocalAdminRecord | null> {
  const raw = await readDurableText(STORE_PATH);
  if (!raw) return readStore();
  try {
    return JSON.parse(raw) as LocalAdminRecord;
  } catch {
    return readStore();
  }
}

/** Waits until the plaintext password is stored, so the settings page can show it. */
export async function saveLocalAdminAsync(
  patch: Partial<Pick<LocalAdminRecord, "email" | "passwordHash" | "passwordPlain">>,
): Promise<LocalAdminRecord> {
  const current = (await loadLocalAdminAsync()) ?? readStore();
  const record = recordFromPatch(current, patch);
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(record, null, 2), "utf8");
  return record;
}

export function loadLocalAdmin(): LocalAdminRecord | null {
  return readStore();
}

export function revealAdminPassword(
  passwordHash: string | null | undefined,
  passwordPlain?: string | null,
): string {
  const hash = (passwordHash || "").trim();
  if (!hash) return "";
  const plain = (passwordPlain || "").trim();
  if (plain && verifySecret(plain, hash)) return plain;
  const bootstrap = bootstrapAdminPassword();
  if (bootstrap && verifySecret(bootstrap, hash)) return bootstrap;
  return "";
}

export function saveLocalAdmin(
  patch: Partial<Pick<LocalAdminRecord, "email" | "passwordHash" | "passwordPlain">>,
): LocalAdminRecord {
  const record = recordFromPatch(readStore(), patch);
  writeStore(record);
  return record;
}

export function provisionLocalAdmin(): LocalAdminRecord | null {
  const current = readStore();
  const bootstrap = bootstrapAdminPassword();
  if (!current || LEGACY_EMAILS.has(current.email)) {
    if (!bootstrap) return current;
    return saveLocalAdmin({
      email: TEST_ADMIN_EMAIL,
      passwordHash: hashSecret(bootstrap),
      passwordPlain: bootstrap,
    });
  }

  return current;
}
