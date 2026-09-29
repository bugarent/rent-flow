import { dataRoot } from "@/lib/persistent-paths";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  LOCAL_PARTNER_ID,
  TEST_PARTNER_PASSWORD,
  loadLocalPartner,
} from "@/lib/auth/local-partner-store";
import { verifySecret } from "@/lib/crypto";

const STORE = join(dataRoot(), "partner-credentials.json");

export type PartnerCredentialRecord = {
  email: string;
  password: string;
  updatedAt: string;
};

type StoreFile = Record<string, PartnerCredentialRecord>;

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoreFile;
  } catch {
    return {};
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Find plaintext password stored under any partner id for this login email. */
function passwordForEmail(store: StoreFile, email: string): string {
  const want = normalizeEmail(email);
  if (!want) return "";
  for (const row of Object.values(store)) {
    if (normalizeEmail(row.email || "") === want && row.password?.trim()) {
      return row.password.trim();
    }
  }
  return "";
}

function resolveKnownTestPassword(email: string, passwordHash?: string | null): string {
  const local = loadLocalPartner();
  if (!local?.passwordHash && !passwordHash) return "";
  const hash = passwordHash || local?.passwordHash || "";
  if (!hash) return "";
  if (local && normalizeEmail(local.email) === normalizeEmail(email) && verifySecret(TEST_PARTNER_PASSWORD, hash)) {
    return TEST_PARTNER_PASSWORD;
  }
  if (verifySecret(TEST_PARTNER_PASSWORD, hash)) {
    return TEST_PARTNER_PASSWORD;
  }
  return "";
}

/**
 * Portal login credentials for admin display.
 * Prefer auth identity (User / local partner account), never invent stale test defaults
 * unless the local partner hash still matches the known test password.
 */
export async function getPartnerCredentials(partnerId: string): Promise<PartnerCredentialRecord | null> {
  const store = await readStore();
  const row = store[partnerId];
  const local = loadLocalPartner();
  const isLocal = partnerId === LOCAL_PARTNER_ID || (local != null && partnerId === local.id);

  const emailFromRow = row?.email ? normalizeEmail(row.email) : "";
  const emailFromLocal = isLocal && local?.email ? normalizeEmail(local.email) : "";
  const email = emailFromLocal || emailFromRow || "";

  const password =
    (row?.password || "").trim() ||
    (email ? passwordForEmail(store, email) : "") ||
    (isLocal && local ? resolveKnownTestPassword(email || local.email, local.passwordHash) : "") ||
    "";

  if (email && password) {
    return {
      email,
      password,
      updatedAt: row?.updatedAt || new Date().toISOString(),
    };
  }

  if (email) {
    return {
      email,
      password: "",
      updatedAt: row?.updatedAt || new Date().toISOString(),
    };
  }

  if (row?.email) {
    return {
      email: normalizeEmail(row.email),
      password: (row.password || "").trim(),
      updatedAt: row.updatedAt,
    };
  }

  return null;
}

export async function setPartnerCredentials(
  partnerId: string,
  email: string,
  password: string,
): Promise<PartnerCredentialRecord> {
  const store = await readStore();
  const existing = store[partnerId];
  const normalizedEmail = normalizeEmail(email) || normalizeEmail(existing?.email || "");
  const incoming = (password || "").trim();
  const preserved =
    incoming ||
    (existing?.password || "").trim() ||
    (normalizedEmail ? passwordForEmail(store, normalizedEmail) : "") ||
    "";

  const next: PartnerCredentialRecord = {
    email: normalizedEmail,
    password: preserved,
    updatedAt: new Date().toISOString(),
  };
  store[partnerId] = next;

  // Keep local-partner alias in sync when either id is updated.
  const local = loadLocalPartner();
  if (partnerId === LOCAL_PARTNER_ID || (local && partnerId === local.id)) {
    store[LOCAL_PARTNER_ID] = next;
  } else if (local && normalizeEmail(local.email) === next.email) {
    store[LOCAL_PARTNER_ID] = next;
  }

  // Mirror under any other ids that already share this login email.
  if (next.email && next.password) {
    for (const [id, row] of Object.entries(store)) {
      if (id === partnerId || id === LOCAL_PARTNER_ID) continue;
      if (normalizeEmail(row.email || "") === next.email) {
        store[id] = { ...next, updatedAt: next.updatedAt };
      }
    }
  }

  await writeStore(store);
  return next;
}

/** Persist plaintext portal password after a successful partner login or password change. */
export async function rememberPartnerPortalPassword(
  partnerId: string,
  email: string,
  password: string,
): Promise<void> {
  const plain = (password || "").trim();
  const mail = normalizeEmail(email);
  if (!partnerId || !mail || !plain) return;
  await setPartnerCredentials(partnerId, mail, plain);
}

export async function setPartnerCredentialsByEmail(email: string, password: string, partnerId?: string) {
  const normalized = normalizeEmail(email);
  const store = await readStore();
  const id =
    partnerId ||
    Object.entries(store).find(([, row]) => normalizeEmail(row.email) === normalized)?.[0] ||
    normalized;
  return setPartnerCredentials(id, normalized, password);
}
