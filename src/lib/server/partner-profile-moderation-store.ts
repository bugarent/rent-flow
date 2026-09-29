import { dataRoot } from "@/lib/persistent-paths";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  emptyProfileModeration,
  parseProfileModeration,
  type PartnerProfileModeration,
} from "@/lib/partners/profile-moderation";

const STORE = join(dataRoot(), "partner-profile-moderation.json");

type StoreFile = Record<string, PartnerProfileModeration>;

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

export async function readProfileModerationFile(partnerId: string): Promise<PartnerProfileModeration> {
  const store = await readStore();
  return store[partnerId] ? parseProfileModeration(store[partnerId]) : emptyProfileModeration();
}

export async function writeProfileModerationFile(
  partnerId: string,
  moderation: PartnerProfileModeration,
): Promise<PartnerProfileModeration> {
  const next = parseProfileModeration(moderation);
  const store = await readStore();
  store[partnerId] = next;
  await writeStore(store);
  return next;
}

export async function listAllProfileModerationFiles(): Promise<
  Array<{ partnerId: string; moderation: PartnerProfileModeration }>
> {
  const store = await readStore();
  return Object.entries(store)
    .map(([partnerId, raw]) => ({
      partnerId,
      moderation: parseProfileModeration(raw),
    }))
    .filter(
      (row) =>
        row.moderation.pendingChanges.length > 0 ||
        row.moderation.unreadCount > 0 ||
        Boolean(row.moderation.countriesEditUnlockUntil),
    );
}

export async function resolveProfileModeration(partner: {
  id: string;
  profileModeration?: unknown;
}): Promise<PartnerProfileModeration> {
  const fromDb = parseProfileModeration(partner.profileModeration);
  if (fromDb.pendingChanges.length || fromDb.countriesEditUnlockUntil || fromDb.unreadCount) {
    return fromDb;
  }
  return readProfileModerationFile(partner.id);
}
