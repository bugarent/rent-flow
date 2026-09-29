import { NextResponse } from "next/server";
import { extractApiKeyFromHeaders } from "@/lib/integrations/auth";
import { appendLog, resolveIntegrationByApiKey, saveMappings, listMappings } from "@/lib/integrations/repository";
import { fleetPayloadSchema } from "@/lib/integrations/types";
import { findMapping } from "@/lib/integrations/mapping";
import { summarizePayload } from "@/lib/integrations/http";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";

export async function POST(req: Request) {
  const key = extractApiKeyFromHeaders(req.headers);
  if (!key) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const integration = await resolveIntegrationByApiKey(key);
  if (!integration) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  if (integration.manualOverride) {
    return NextResponse.json({ error: "Manual override active" }, { status: 423 });
  }
  if (!["LIVE", "TESTING"].includes(integration.status)) {
    return NextResponse.json({ error: "Integration not active" }, { status: 403 });
  }
  if (integration.syncMode === "PULL") {
    return NextResponse.json({ error: "PUSH not enabled for this integration" }, { status: 403 });
  }

  const started = Date.now();
  try {
    const body = await req.json();
    const parsed = fleetPayloadSchema.safeParse(body);
    if (!parsed.success) {
      await appendLog({
        integrationId: integration.id,
        direction: "IN",
        event: "PULL_FLEET",
        status: "ERROR",
        latencyMs: Date.now() - started,
        requestSummary: summarizePayload(body),
        responseSummary: "",
        errorMessage: parsed.error.message,
      });
      return NextResponse.json({ error: "Invalid fleet payload" }, { status: 400 });
    }

    const mappings = await listMappings(integration.id);
    let imported = 0;
    const next = [...mappings];

    for (const vehicle of parsed.data.vehicles) {
      const existing = findMapping(mappings, "VEHICLE", vehicle.externalId);
      let carId = existing?.internalId;
      try {
        if (carId && !carId.startsWith("file-car-")) {
          await prisma.car.update({
            where: { id: carId },
            data: {
              title: `${vehicle.make} ${vehicle.model}`,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              dailyRateEur: vehicle.dailyRate ?? 40,
              status: vehicle.active ? "APPROVED" : "HIDDEN",
            },
          });
        } else {
          const car = await prisma.car.create({
            data: {
              partnerId: integration.partnerId,
              title: `${vehicle.make} ${vehicle.model}`,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              dailyRateEur: vehicle.dailyRate ?? 40,
              status: vehicle.active ? "APPROVED" : "HIDDEN",
              seats: 5,
              doors: 4,
              transmission: "AUTOMATIC",
              fuelType: "PETROL",
              categorySlug: vehicle.category || null,
            },
          });
          carId = car.id;
        }
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
        carId = carId || `file-car-${vehicle.externalId}`;
      }
      imported += 1;
      const row = {
        kind: "VEHICLE" as const,
        externalId: vehicle.externalId,
        externalLabel: `${vehicle.make} ${vehicle.model}`,
        internalId: carId!,
        meta: { year: vehicle.year, category: vehicle.category },
      };
      const idx = next.findIndex((m) => m.kind === "VEHICLE" && m.externalId === vehicle.externalId);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          ...row,
          updatedAt: new Date().toISOString(),
        };
      } else {
        next.push({
          id: `tmp-${vehicle.externalId}`,
          integrationId: integration.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...row,
        });
      }
    }

    await saveMappings(
      integration.id,
      next.map((m) => ({
        kind: m.kind,
        externalId: m.externalId,
        externalLabel: m.externalLabel,
        internalId: m.internalId,
        meta: m.meta,
      })),
    );

    await appendLog({
      integrationId: integration.id,
      direction: "IN",
      event: "PULL_FLEET",
      status: "OK",
      latencyMs: Date.now() - started,
      requestSummary: `PUSH fleet ${imported} vehicles`,
      responseSummary: `Imported ${imported}`,
      errorMessage: null,
    });

    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    await appendLog({
      integrationId: integration.id,
      direction: "IN",
      event: "PULL_FLEET",
      status: "ERROR",
      latencyMs: Date.now() - started,
      requestSummary: "PUSH /fleet",
      responseSummary: "",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to ingest fleet" }, { status: 500 });
  }
}
