import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  IntegrationMappingRecord,
  IntegrationSyncEvent,
  IntegrationSyncLogRecord,
  IntegrationSyncMode,
  IntegrationStatus,
  PartnerIntegrationRecord,
} from "@/lib/integrations/types";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "integrations.json");

type StoreFile = {
  integrations: PartnerIntegrationRecord[];
  mappings: IntegrationMappingRecord[];
  logs: IntegrationSyncLogRecord[];
};

function emptyStore(): StoreFile {
  return { integrations: [], mappings: [], logs: [] };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : [],
      mappings: Array.isArray(parsed.mappings) ? parsed.mappings : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  // Keep last 500 logs
  store.logs = store.logs
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 500);
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listIntegrationsFile(): Promise<PartnerIntegrationRecord[]> {
  const store = await readStore();
  return store.integrations.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getIntegrationFile(id: string): Promise<PartnerIntegrationRecord | null> {
  const store = await readStore();
  return store.integrations.find((i) => i.id === id) ?? null;
}

export async function findIntegrationByApiKeyPrefixFile(
  prefix: string,
): Promise<PartnerIntegrationRecord | null> {
  const store = await readStore();
  return store.integrations.find((i) => i.apiKeyPrefix === prefix) ?? null;
}

export async function createIntegrationFile(
  input: Omit<PartnerIntegrationRecord, "id" | "createdAt" | "updatedAt">,
): Promise<PartnerIntegrationRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const row: PartnerIntegrationRecord = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  store.integrations.unshift(row);
  await writeStore(store);
  return row;
}

export async function updateIntegrationFile(
  id: string,
  patch: Partial<PartnerIntegrationRecord>,
): Promise<PartnerIntegrationRecord | null> {
  const store = await readStore();
  const idx = store.integrations.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  store.integrations[idx] = {
    ...store.integrations[idx],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.integrations[idx];
}

export async function deleteIntegrationFile(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.integrations.length;
  store.integrations = store.integrations.filter((i) => i.id !== id);
  store.mappings = store.mappings.filter((m) => m.integrationId !== id);
  store.logs = store.logs.filter((l) => l.integrationId !== id);
  if (store.integrations.length === before) return false;
  await writeStore(store);
  return true;
}

export async function listMappingsFile(integrationId: string): Promise<IntegrationMappingRecord[]> {
  const store = await readStore();
  return store.mappings.filter((m) => m.integrationId === integrationId);
}

export async function replaceMappingsFile(
  integrationId: string,
  mappings: Array<Omit<IntegrationMappingRecord, "id" | "createdAt" | "updatedAt" | "integrationId">>,
): Promise<IntegrationMappingRecord[]> {
  const store = await readStore();
  const now = new Date().toISOString();
  store.mappings = store.mappings.filter((m) => m.integrationId !== integrationId);
  const next = mappings.map((m) => ({
    ...m,
    id: randomUUID(),
    integrationId,
    createdAt: now,
    updatedAt: now,
  }));
  store.mappings.push(...next);
  await writeStore(store);
  return next;
}

export async function listLogsFile(
  integrationId: string,
  limit = 50,
): Promise<IntegrationSyncLogRecord[]> {
  const store = await readStore();
  return store.logs
    .filter((l) => l.integrationId === integrationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function appendLogFile(
  input: Omit<IntegrationSyncLogRecord, "id" | "createdAt">,
): Promise<IntegrationSyncLogRecord> {
  const store = await readStore();
  const row: IntegrationSyncLogRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.logs.unshift(row);
  await writeStore(store);
  return row;
}

export async function findIntegrationsDueForPollFile(
  now = new Date(),
): Promise<PartnerIntegrationRecord[]> {
  const store = await readStore();
  return store.integrations.filter((i) => {
    if (i.status !== "LIVE" || i.manualOverride) return false;
    if (i.syncMode === "PUSH") return false;
    if (!i.lastSyncAt) return true;
    const dueAt = new Date(i.lastSyncAt).getTime() + i.pollIntervalMinutes * 60_000;
    return now.getTime() >= dueAt;
  });
}

export type CreateIntegrationInput = {
  partnerId: string;
  partnerName?: string;
  name: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  webhookUrl?: string | null;
  syncMode?: IntegrationSyncMode;
  status?: IntegrationStatus;
  isSandbox?: boolean;
  pollIntervalMinutes?: number;
};

export async function createIntegrationInputFile(
  input: CreateIntegrationInput,
): Promise<PartnerIntegrationRecord> {
  return createIntegrationFile({
    partnerId: input.partnerId,
    partnerName: input.partnerName,
    name: input.name,
    provider: "RAC_GENERIC",
    status: input.status ?? "DRAFT",
    apiKeyHash: input.apiKeyHash,
    apiKeyPrefix: input.apiKeyPrefix,
    webhookUrl: input.webhookUrl ?? null,
    syncMode: input.syncMode ?? "BOTH",
    manualOverride: false,
    pollIntervalMinutes: input.pollIntervalMinutes ?? 30,
    lastTestAt: null,
    lastTestOk: null,
    lastSyncAt: null,
    isSandbox: Boolean(input.isSandbox),
  });
}

export type { IntegrationSyncEvent };
