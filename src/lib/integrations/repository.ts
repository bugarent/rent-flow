import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  appendLogFile,
  createIntegrationInputFile,
  deleteIntegrationFile,
  findIntegrationByApiKeyPrefixFile,
  getIntegrationFile,
  listIntegrationsFile,
  listLogsFile,
  listMappingsFile,
  replaceMappingsFile,
  updateIntegrationFile,
  findIntegrationsDueForPollFile,
} from "@/lib/server/integration-store";
import { verifyIntegrationApiKey } from "@/lib/integrations/auth";
import type {
  IntegrationMappingRecord,
  IntegrationSyncLogRecord,
  IntegrationSyncMode,
  IntegrationStatus,
  PartnerIntegrationRecord,
} from "@/lib/integrations/types";

function mapPrismaIntegration(row: {
  id: string;
  partnerId: string;
  name: string;
  provider: string;
  status: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  webhookUrl: string | null;
  syncMode: string;
  manualOverride: boolean;
  pollIntervalMinutes: number;
  lastTestAt: Date | null;
  lastTestOk: boolean | null;
  lastSyncAt: Date | null;
  isSandbox: boolean;
  createdAt: Date;
  updatedAt: Date;
  partner?: { companyName?: string } | null;
}): PartnerIntegrationRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    partnerName: row.partner?.companyName,
    name: row.name,
    provider: row.provider,
    status: row.status as IntegrationStatus,
    apiKeyHash: row.apiKeyHash,
    apiKeyPrefix: row.apiKeyPrefix,
    webhookUrl: row.webhookUrl,
    syncMode: row.syncMode as IntegrationSyncMode,
    manualOverride: row.manualOverride,
    pollIntervalMinutes: row.pollIntervalMinutes,
    lastTestAt: row.lastTestAt?.toISOString() ?? null,
    lastTestOk: row.lastTestOk,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    isSandbox: row.isSandbox,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listIntegrations(): Promise<{
  items: PartnerIntegrationRecord[];
  source: "db" | "file";
}> {
  try {
    const rows = await prisma.partnerIntegration.findMany({
      include: { partner: { select: { companyName: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return { items: rows.map(mapPrismaIntegration), source: "db" };
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] list db failed", error);
    return { items: await listIntegrationsFile(), source: "file" };
  }
}

export async function getIntegration(id: string): Promise<PartnerIntegrationRecord | null> {
  try {
    const row = await prisma.partnerIntegration.findUnique({
      where: { id },
      include: { partner: { select: { companyName: true } } },
    });
    if (row) return mapPrismaIntegration(row);
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] get db failed", error);
  }
  return getIntegrationFile(id);
}

export async function createIntegration(input: {
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
}): Promise<{ item: PartnerIntegrationRecord; source: "db" | "file" }> {
  try {
    const row = await prisma.partnerIntegration.create({
      data: {
        partnerId: input.partnerId,
        name: input.name,
        apiKeyHash: input.apiKeyHash,
        apiKeyPrefix: input.apiKeyPrefix,
        webhookUrl: input.webhookUrl ?? null,
        syncMode: input.syncMode ?? "BOTH",
        status: input.status ?? "DRAFT",
        isSandbox: Boolean(input.isSandbox),
        pollIntervalMinutes: input.pollIntervalMinutes ?? 30,
      },
      include: { partner: { select: { companyName: true } } },
    });
    return { item: mapPrismaIntegration(row), source: "db" };
  } catch (error) {
    // FK missing partner / offline DB → file store
    console.warn("[integrations] create db failed, using file store", error);
    const item = await createIntegrationInputFile(input);
    return { item, source: "file" };
  }
}

export async function patchIntegration(
  id: string,
  patch: Partial<{
    name: string;
    webhookUrl: string | null;
    syncMode: IntegrationSyncMode;
    status: IntegrationStatus;
    manualOverride: boolean;
    pollIntervalMinutes: number;
    apiKeyHash: string;
    apiKeyPrefix: string;
    lastTestAt: string | null;
    lastTestOk: boolean | null;
    lastSyncAt: string | null;
  }>,
): Promise<PartnerIntegrationRecord | null> {
  try {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.webhookUrl !== undefined) data.webhookUrl = patch.webhookUrl;
    if (patch.syncMode !== undefined) data.syncMode = patch.syncMode;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.manualOverride !== undefined) data.manualOverride = patch.manualOverride;
    if (patch.pollIntervalMinutes !== undefined) data.pollIntervalMinutes = patch.pollIntervalMinutes;
    if (patch.apiKeyHash !== undefined) data.apiKeyHash = patch.apiKeyHash;
    if (patch.apiKeyPrefix !== undefined) data.apiKeyPrefix = patch.apiKeyPrefix;
    if (patch.lastTestAt !== undefined) data.lastTestAt = patch.lastTestAt ? new Date(patch.lastTestAt) : null;
    if (patch.lastTestOk !== undefined) data.lastTestOk = patch.lastTestOk;
    if (patch.lastSyncAt !== undefined) data.lastSyncAt = patch.lastSyncAt ? new Date(patch.lastSyncAt) : null;

    const row = await prisma.partnerIntegration.update({
      where: { id },
      data: data as never,
      include: { partner: { select: { companyName: true } } },
    });
    // Mirror to file for offline resilience
    await updateIntegrationFile(id, mapPrismaIntegration(row)).catch(() => null);
    return mapPrismaIntegration(row);
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] patch db failed", error);
    return updateIntegrationFile(id, patch as Partial<PartnerIntegrationRecord>);
  }
}

export async function removeIntegration(id: string): Promise<boolean> {
  try {
    await prisma.partnerIntegration.delete({ where: { id } });
    await deleteIntegrationFile(id).catch(() => null);
    return true;
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] delete db failed", error);
    return deleteIntegrationFile(id);
  }
}

export async function listMappings(integrationId: string): Promise<IntegrationMappingRecord[]> {
  try {
    const rows = await prisma.integrationMapping.findMany({
      where: { integrationId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      integrationId: r.integrationId,
      kind: r.kind as IntegrationMappingRecord["kind"],
      externalId: r.externalId,
      externalLabel: r.externalLabel,
      internalId: r.internalId,
      meta: (r.meta as Record<string, unknown>) || {},
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] mappings db failed", error);
    return listMappingsFile(integrationId);
  }
}

export async function saveMappings(
  integrationId: string,
  mappings: Array<{
    kind: IntegrationMappingRecord["kind"];
    externalId: string;
    externalLabel?: string;
    internalId: string;
    meta?: Record<string, unknown>;
  }>,
): Promise<IntegrationMappingRecord[]> {
  try {
    await prisma.integrationMapping.deleteMany({ where: { integrationId } });
    if (mappings.length) {
      await prisma.integrationMapping.createMany({
        data: mappings.map((m) => ({
          integrationId,
          kind: m.kind,
          externalId: m.externalId,
          externalLabel: m.externalLabel || "",
          internalId: m.internalId,
          meta: (m.meta || {}) as Prisma.InputJsonValue,
        })),
      });
    }
    const rows = await listMappings(integrationId);
    await replaceMappingsFile(
      integrationId,
      mappings.map((m) => ({
        kind: m.kind,
        externalId: m.externalId,
        externalLabel: m.externalLabel || "",
        internalId: m.internalId,
        meta: m.meta || {},
      })),
    ).catch(() => null);
    return rows;
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] save mappings db failed", error);
    return replaceMappingsFile(
      integrationId,
      mappings.map((m) => ({
        kind: m.kind,
        externalId: m.externalId,
        externalLabel: m.externalLabel || "",
        internalId: m.internalId,
        meta: m.meta || {},
      })),
    );
  }
}

export async function listLogs(integrationId: string, limit = 50): Promise<IntegrationSyncLogRecord[]> {
  try {
    const rows = await prisma.integrationSyncLog.findMany({
      where: { integrationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      integrationId: r.integrationId,
      direction: r.direction as "IN" | "OUT",
      event: r.event as IntegrationSyncLogRecord["event"],
      status: r.status as "OK" | "ERROR",
      latencyMs: r.latencyMs,
      requestSummary: r.requestSummary,
      responseSummary: r.responseSummary,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] logs db failed", error);
    return listLogsFile(integrationId, limit);
  }
}

export async function appendLog(
  input: Omit<IntegrationSyncLogRecord, "id" | "createdAt">,
): Promise<IntegrationSyncLogRecord> {
  try {
    const row = await prisma.integrationSyncLog.create({
      data: {
        integrationId: input.integrationId,
        direction: input.direction,
        event: input.event,
        status: input.status,
        latencyMs: input.latencyMs,
        requestSummary: input.requestSummary,
        responseSummary: input.responseSummary,
        errorMessage: input.errorMessage,
      },
    });
    const mapped: IntegrationSyncLogRecord = {
      id: row.id,
      integrationId: row.integrationId,
      direction: row.direction as "IN" | "OUT",
      event: row.event as IntegrationSyncLogRecord["event"],
      status: row.status as "OK" | "ERROR",
      latencyMs: row.latencyMs,
      requestSummary: row.requestSummary,
      responseSummary: row.responseSummary,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
    };
    await appendLogFile(input).catch(() => null);
    return mapped;
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] append log db failed", error);
    return appendLogFile(input);
  }
}

export async function resolveIntegrationByApiKey(fullKey: string): Promise<PartnerIntegrationRecord | null> {
  const prefix = fullKey.slice(0, 16);
  try {
    const candidates = await prisma.partnerIntegration.findMany({
      where: { apiKeyPrefix: prefix },
      include: { partner: { select: { companyName: true } } },
      take: 5,
    });
    for (const row of candidates) {
      if (verifyIntegrationApiKey(fullKey, row.apiKeyHash)) return mapPrismaIntegration(row);
    }
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] resolve key db failed", error);
  }
  const file = await findIntegrationByApiKeyPrefixFile(prefix);
  if (file && verifyIntegrationApiKey(fullKey, file.apiKeyHash)) return file;
  // Slow path: scan file store prefixes
  const all = await listIntegrationsFile();
  for (const row of all) {
    if (verifyIntegrationApiKey(fullKey, row.apiKeyHash)) return row;
  }
  return null;
}

export async function listDueIntegrations(): Promise<PartnerIntegrationRecord[]> {
  try {
    const rows = await prisma.partnerIntegration.findMany({
      where: {
        status: "LIVE",
        manualOverride: false,
        syncMode: { in: ["PULL", "BOTH"] },
      },
      include: { partner: { select: { companyName: true } } },
    });
    const now = Date.now();
    return rows
      .map(mapPrismaIntegration)
      .filter((i) => {
        if (!i.lastSyncAt) return true;
        return now >= new Date(i.lastSyncAt).getTime() + i.pollIntervalMinutes * 60_000;
      });
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[integrations] due list db failed", error);
    return findIntegrationsDueForPollFile();
  }
}
