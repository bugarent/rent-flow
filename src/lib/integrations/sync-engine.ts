import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { integrationFetch, summarizePayload } from "@/lib/integrations/http";
import { findMapping } from "@/lib/integrations/mapping";
import {
  appendLog,
  getIntegration,
  listMappings,
  patchIntegration,
} from "@/lib/integrations/repository";
import {
  availabilityPayloadSchema,
  bookingLockResponseSchema,
  bookingLockSchema,
  fleetPayloadSchema,
  type BookingLockRequest,
  type FleetItem,
  type PartnerIntegrationRecord,
} from "@/lib/integrations/types";
import {
  getMockAvailability,
  getMockFleet,
  mockLockBooking,
  mockUnlockBooking,
} from "@/lib/integrations/sandbox/simulator";

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function isSandboxWebhook(url: string | null | undefined) {
  if (!url) return false;
  return url.includes("/api/integrations/sandbox/mock");
}

export async function testConnection(integrationId: string): Promise<{
  ok: boolean;
  latencyMs: number;
  format?: string;
  message: string;
}> {
  const integration = await getIntegration(integrationId);
  if (!integration) return { ok: false, latencyMs: 0, message: "Integration not found" };
  if (!integration.webhookUrl) {
    await appendLog({
      integrationId,
      direction: "OUT",
      event: "TEST",
      status: "ERROR",
      latencyMs: 0,
      requestSummary: "No webhookUrl configured",
      responseSummary: "",
      errorMessage: "webhookUrl required for Test Connection",
    });
    await patchIntegration(integrationId, {
      lastTestAt: new Date().toISOString(),
      lastTestOk: false,
    });
    return { ok: false, latencyMs: 0, message: "Configure webhook URL first" };
  }

  let result;
  if (isSandboxWebhook(integration.webhookUrl) || integration.isSandbox) {
    const started = Date.now();
    const fleet = getMockFleet();
    const parsed = fleetPayloadSchema.safeParse(fleet);
    result = {
      ok: parsed.success,
      status: 200,
      latencyMs: Date.now() - started,
      format: "json" as const,
      parsed: fleet,
      bodyText: JSON.stringify(fleet).slice(0, 500),
      contentType: "application/json",
      error: parsed.success ? undefined : parsed.error.message,
    };
  } else {
    result = await integrationFetch(joinUrl(integration.webhookUrl, "/fleet"), {
      method: "GET",
      timeoutMs: 8000,
    });
  }

  const parsed = fleetPayloadSchema.safeParse(result.parsed);
  const ok = result.ok && (parsed.success || result.format === "xml");
  await appendLog({
    integrationId,
    direction: "OUT",
    event: "TEST",
    status: ok ? "OK" : "ERROR",
    latencyMs: result.latencyMs,
    requestSummary: `GET ${joinUrl(integration.webhookUrl, "/fleet")}`,
    responseSummary: summarizePayload(result.parsed ?? result.bodyText),
    errorMessage: ok ? null : result.error || (parsed.success ? null : parsed.error.message),
  });
  await patchIntegration(integrationId, {
    lastTestAt: new Date().toISOString(),
    lastTestOk: ok,
    status: ok && integration.status === "DRAFT" ? "TESTING" : integration.status,
  });

  return {
    ok,
    latencyMs: result.latencyMs,
    format: result.format,
    message: ok
      ? `Connection OK (${result.format}, ${result.latencyMs}ms)`
      : result.error || "Invalid fleet payload",
  };
}

async function fetchFleet(integration: PartnerIntegrationRecord) {
  if (!integration.webhookUrl) throw new Error("webhookUrl required");
  if (isSandboxWebhook(integration.webhookUrl) || integration.isSandbox) {
    return { ok: true, latencyMs: 1, parsed: getMockFleet(), error: undefined as string | undefined };
  }
  const result = await integrationFetch(joinUrl(integration.webhookUrl, "/fleet"), {
    method: "GET",
    timeoutMs: 20000,
  });
  return result;
}

async function fetchAvailability(integration: PartnerIntegrationRecord) {
  if (!integration.webhookUrl) throw new Error("webhookUrl required");
  if (isSandboxWebhook(integration.webhookUrl) || integration.isSandbox) {
    return {
      ok: true,
      latencyMs: 1,
      parsed: getMockAvailability(),
      error: undefined as string | undefined,
    };
  }
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 90 * 86400000).toISOString();
  return integrationFetch(
    `${joinUrl(integration.webhookUrl, "/availability")}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { method: "GET", timeoutMs: 20000 },
  );
}

async function upsertMappedCar(partnerId: string, item: FleetItem, existingCarId?: string) {
  const data = {
    partnerId,
    title: `${item.make} ${item.model}`,
    make: item.make,
    model: item.model,
    year: item.year,
    categorySlug: item.category || null,
    dailyRateEur: item.dailyRate ?? 40,
    status: item.active ? ("APPROVED" as const) : ("HIDDEN" as const),
  };

  try {
    if (existingCarId) {
      const car = await prisma.car.update({
        where: { id: existingCarId },
        data: {
          title: data.title,
          make: data.make,
          model: data.model,
          year: data.year,
          categorySlug: data.categorySlug ?? undefined,
          dailyRateEur: data.dailyRateEur,
          status: data.status === "APPROVED" ? "APPROVED" : "HIDDEN",
        },
      });
      return car.id;
    }
    const car = await prisma.car.create({
      data: {
        partnerId,
        title: data.title,
        make: data.make,
        model: data.model,
        year: data.year,
        categorySlug: data.categorySlug ?? undefined,
        dailyRateEur: data.dailyRateEur,
        status: data.status === "APPROVED" ? "APPROVED" : "HIDDEN",
        seats: 5,
        doors: 4,
        transmission: "AUTOMATIC",
        fuelType: "PETROL",
      },
    });
    if (item.photos?.[0]) {
      await prisma.carPhoto.create({
        data: { carId: car.id, url: item.photos[0], sortOrder: 0 },
      });
    }
    return car.id;
  } catch (error) {
    if (isDbOfflineError(error)) {
      // Offline: keep mapping external-only; return synthetic id for mapping
      return existingCarId || `file-car-${item.externalId}`;
    }
    throw error;
  }
}

export async function pullFleet(integrationId: string): Promise<{
  ok: boolean;
  imported: number;
  message: string;
}> {
  const integration = await getIntegration(integrationId);
  if (!integration) return { ok: false, imported: 0, message: "Integration not found" };
  if (integration.manualOverride) {
    return { ok: false, imported: 0, message: "Manual override enabled — auto-sync skipped" };
  }
  if (integration.syncMode === "PUSH") {
    return { ok: false, imported: 0, message: "Sync mode is PUSH-only" };
  }

  try {
    const result = await fetchFleet(integration);
    const parsed = fleetPayloadSchema.safeParse(result.parsed);
    if (!result.ok || !parsed.success) {
      await appendLog({
        integrationId,
        direction: "IN",
        event: "PULL_FLEET",
        status: "ERROR",
        latencyMs: result.latencyMs || 0,
        requestSummary: "GET /fleet",
        responseSummary: summarizePayload(result.parsed),
        errorMessage: result.error || (parsed.success ? null : parsed.error.message),
      });
      return { ok: false, imported: 0, message: result.error || "Invalid fleet payload" };
    }

    const mappings = await listMappings(integrationId);
    let imported = 0;
    const nextMappings = [...mappings];

    for (const vehicle of parsed.data.vehicles) {
      const existing = findMapping(mappings, "VEHICLE", vehicle.externalId);
      const carId = await upsertMappedCar(integration.partnerId, vehicle, existing?.internalId);
      imported += 1;
      const idx = nextMappings.findIndex(
        (m) => m.kind === "VEHICLE" && m.externalId === vehicle.externalId,
      );
      const row = {
        id: existing?.id || `tmp-${vehicle.externalId}`,
        integrationId,
        kind: "VEHICLE" as const,
        externalId: vehicle.externalId,
        externalLabel: `${vehicle.make} ${vehicle.model}`,
        internalId: carId,
        meta: { year: vehicle.year, category: vehicle.category },
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) nextMappings[idx] = row;
      else nextMappings.push(row);
    }

    const { saveMappings } = await import("@/lib/integrations/repository");
    await saveMappings(
      integrationId,
      nextMappings
        .filter((m) => m.kind === "VEHICLE" || m.kind === "LOCATION" || m.kind === "CATEGORY")
        .map((m) => ({
          kind: m.kind,
          externalId: m.externalId,
          externalLabel: m.externalLabel,
          internalId: m.internalId,
          meta: m.meta,
        })),
    );

    await appendLog({
      integrationId,
      direction: "IN",
      event: "PULL_FLEET",
      status: "OK",
      latencyMs: result.latencyMs || 0,
      requestSummary: "GET /fleet",
      responseSummary: `Imported ${imported} vehicles`,
      errorMessage: null,
    });
    await patchIntegration(integrationId, { lastSyncAt: new Date().toISOString() });
    return { ok: true, imported, message: `Imported ${imported} vehicles` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      integrationId,
      direction: "IN",
      event: "PULL_FLEET",
      status: "ERROR",
      latencyMs: 0,
      requestSummary: "GET /fleet",
      responseSummary: "",
      errorMessage: message,
    });
    return { ok: false, imported: 0, message };
  }
}

export async function pullAvailability(integrationId: string): Promise<{
  ok: boolean;
  blocks: number;
  message: string;
}> {
  const integration = await getIntegration(integrationId);
  if (!integration) return { ok: false, blocks: 0, message: "Integration not found" };
  if (integration.manualOverride) {
    return { ok: false, blocks: 0, message: "Manual override enabled — auto-sync skipped" };
  }

  try {
    const result = await fetchAvailability(integration);
    const parsed = availabilityPayloadSchema.safeParse(result.parsed);
    if (!result.ok || !parsed.success) {
      await appendLog({
        integrationId,
        direction: "IN",
        event: "PULL_AVAIL",
        status: "ERROR",
        latencyMs: result.latencyMs || 0,
        requestSummary: "GET /availability",
        responseSummary: summarizePayload(result.parsed),
        errorMessage: result.error || (parsed.success ? null : parsed.error.message),
      });
      return { ok: false, blocks: 0, message: result.error || "Invalid availability payload" };
    }

    const mappings = await listMappings(integrationId);
    let blocks = 0;
    for (const row of parsed.data.availability) {
      const map = findMapping(mappings, "VEHICLE", row.externalId);
      if (!map) continue;
      blocks += row.blocks.length;
      // Soft hold: store blocks in mapping meta for calendar/admin visibility
      map.meta = { ...(map.meta || {}), availabilityBlocks: row.blocks };
    }
    const { saveMappings } = await import("@/lib/integrations/repository");
    await saveMappings(
      integrationId,
      mappings.map((m) => ({
        kind: m.kind,
        externalId: m.externalId,
        externalLabel: m.externalLabel,
        internalId: m.internalId,
        meta: m.meta,
      })),
    );

    await appendLog({
      integrationId,
      direction: "IN",
      event: "PULL_AVAIL",
      status: "OK",
      latencyMs: result.latencyMs || 0,
      requestSummary: "GET /availability",
      responseSummary: `${blocks} blocks across ${parsed.data.availability.length} vehicles`,
      errorMessage: null,
    });
    await patchIntegration(integrationId, { lastSyncAt: new Date().toISOString() });
    return { ok: true, blocks, message: `Synced ${blocks} availability blocks` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      integrationId,
      direction: "IN",
      event: "PULL_AVAIL",
      status: "ERROR",
      latencyMs: 0,
      requestSummary: "GET /availability",
      responseSummary: "",
      errorMessage: message,
    });
    return { ok: false, blocks: 0, message };
  }
}

export async function pushBookingLock(input: {
  integrationId: string;
  lock: BookingLockRequest;
}): Promise<{ ok: boolean; externalBookingId?: string; message: string }> {
  const integration = await getIntegration(input.integrationId);
  if (!integration) return { ok: false, message: "Integration not found" };
  if (integration.manualOverride) {
    await appendLog({
      integrationId: input.integrationId,
      direction: "OUT",
      event: "BOOKING_LOCK",
      status: "OK",
      latencyMs: 0,
      requestSummary: summarizePayload(input.lock),
      responseSummary: "Skipped — manual override",
      errorMessage: null,
    });
    return { ok: true, message: "Skipped — manual override" };
  }
  if (!["LIVE", "TESTING"].includes(integration.status)) {
    return { ok: false, message: "Integration not active" };
  }

  const lockParsed = bookingLockSchema.safeParse(input.lock);
  if (!lockParsed.success) return { ok: false, message: "Invalid lock payload" };

  try {
    let response: unknown;
    let latencyMs = 0;
    if (isSandboxWebhook(integration.webhookUrl) || integration.isSandbox) {
      const started = Date.now();
      response = mockLockBooking(lockParsed.data);
      latencyMs = Date.now() - started;
    } else {
      if (!integration.webhookUrl) return { ok: false, message: "webhookUrl required" };
      const result = await integrationFetch(joinUrl(integration.webhookUrl, "/bookings/lock"), {
        method: "POST",
        timeoutMs: 20000,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lockParsed.data),
      });
      latencyMs = result.latencyMs;
      response = result.parsed;
      if (!result.ok) {
        await appendLog({
          integrationId: input.integrationId,
          direction: "OUT",
          event: "BOOKING_LOCK",
          status: "ERROR",
          latencyMs,
          requestSummary: summarizePayload(lockParsed.data),
          responseSummary: summarizePayload(result.bodyText),
          errorMessage: result.error || "Lock request failed",
        });
        return { ok: false, message: result.error || "Lock request failed" };
      }
    }

    const parsed = bookingLockResponseSchema.safeParse(response);
    const ok = parsed.success && parsed.data.ok;
    await appendLog({
      integrationId: input.integrationId,
      direction: "OUT",
      event: "BOOKING_LOCK",
      status: ok ? "OK" : "ERROR",
      latencyMs,
      requestSummary: summarizePayload(lockParsed.data),
      responseSummary: summarizePayload(response),
      errorMessage: ok ? null : parsed.success ? parsed.data.message || "Lock rejected" : "Invalid lock response",
    });
    return {
      ok,
      externalBookingId: parsed.success ? parsed.data.externalBookingId : undefined,
      message: ok ? "Locked on partner" : parsed.success ? parsed.data.message || "Rejected" : "Invalid response",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      integrationId: input.integrationId,
      direction: "OUT",
      event: "BOOKING_LOCK",
      status: "ERROR",
      latencyMs: 0,
      requestSummary: summarizePayload(lockParsed.data),
      responseSummary: "",
      errorMessage: message,
    });
    return { ok: false, message };
  }
}

export async function pushBookingUnlock(integrationId: string, lockId: string) {
  const integration = await getIntegration(integrationId);
  if (!integration) return { ok: false, message: "Integration not found" };
  if (integration.manualOverride) return { ok: true, message: "Skipped — manual override" };

  if (isSandboxWebhook(integration.webhookUrl) || integration.isSandbox) {
    const res = mockUnlockBooking(lockId);
    await appendLog({
      integrationId,
      direction: "OUT",
      event: "BOOKING_UNLOCK",
      status: res.ok ? "OK" : "ERROR",
      latencyMs: 1,
      requestSummary: lockId,
      responseSummary: summarizePayload(res),
      errorMessage: res.ok ? null : res.message || "Unlock failed",
    });
    return res;
  }
  if (!integration.webhookUrl) return { ok: false, message: "webhookUrl required" };
  const result = await integrationFetch(joinUrl(integration.webhookUrl, "/bookings/unlock"), {
    method: "POST",
    timeoutMs: 20000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lockId }),
  });
  await appendLog({
    integrationId,
    direction: "OUT",
    event: "BOOKING_UNLOCK",
    status: result.ok ? "OK" : "ERROR",
    latencyMs: result.latencyMs,
    requestSummary: lockId,
    responseSummary: summarizePayload(result.parsed ?? result.bodyText),
    errorMessage: result.ok ? null : result.error || null,
  });
  return { ok: result.ok, message: result.ok ? "Unlocked" : result.error || "Unlock failed" };
}

export async function runSandboxCycle(integrationId: string): Promise<{
  ok: boolean;
  steps: string[];
  message: string;
}> {
  const steps: string[] = [];
  const test = await testConnection(integrationId);
  steps.push(`test: ${test.message}`);
  const fleet = await pullFleet(integrationId);
  steps.push(`fleet: ${fleet.message}`);
  const avail = await pullAvailability(integrationId);
  steps.push(`availability: ${avail.message}`);

  const mappings = await listMappings(integrationId);
  const vehicle = mappings.find((m) => m.kind === "VEHICLE");
  if (vehicle) {
    const lock = await pushBookingLock({
      integrationId,
      lock: {
        externalId: vehicle.externalId,
        lockId: `sandbox-${Date.now()}`,
        pickupAt: new Date(Date.now() + 86400000).toISOString(),
        dropoffAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        bookingRef: "SANDBOX-D1000",
      },
    });
    steps.push(`lock: ${lock.message}`);
  } else {
    steps.push("lock: skipped (no vehicle mapping)");
  }

  await appendLog({
    integrationId,
    direction: "OUT",
    event: "SANDBOX",
    status: test.ok && fleet.ok ? "OK" : "ERROR",
    latencyMs: 0,
    requestSummary: "sandbox cycle",
    responseSummary: steps.join(" | "),
    errorMessage: test.ok && fleet.ok ? null : "Sandbox cycle had failures",
  });

  return {
    ok: test.ok && fleet.ok,
    steps,
    message: steps.join(" → "),
  };
}
