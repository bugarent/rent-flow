import { NextResponse } from "next/server";
import { extractApiKeyFromHeaders } from "@/lib/integrations/auth";
import {
  appendLog,
  listMappings,
  resolveIntegrationByApiKey,
  saveMappings,
} from "@/lib/integrations/repository";
import { availabilityPayloadSchema } from "@/lib/integrations/types";
import { findMapping } from "@/lib/integrations/mapping";
import { summarizePayload } from "@/lib/integrations/http";

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
    const parsed = availabilityPayloadSchema.safeParse(body);
    if (!parsed.success) {
      await appendLog({
        integrationId: integration.id,
        direction: "IN",
        event: "PULL_AVAIL",
        status: "ERROR",
        latencyMs: Date.now() - started,
        requestSummary: summarizePayload(body),
        responseSummary: "",
        errorMessage: parsed.error.message,
      });
      return NextResponse.json({ error: "Invalid availability payload" }, { status: 400 });
    }

    const mappings = await listMappings(integration.id);
    let blocks = 0;
    for (const row of parsed.data.availability) {
      const map = findMapping(mappings, "VEHICLE", row.externalId);
      if (!map) continue;
      blocks += row.blocks.length;
      map.meta = { ...(map.meta || {}), availabilityBlocks: row.blocks };
    }
    await saveMappings(
      integration.id,
      mappings.map((m) => ({
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
      event: "PULL_AVAIL",
      status: "OK",
      latencyMs: Date.now() - started,
      requestSummary: "PUSH /availability",
      responseSummary: `${blocks} blocks`,
      errorMessage: null,
    });

    return NextResponse.json({ ok: true, blocks });
  } catch (error) {
    await appendLog({
      integrationId: integration.id,
      direction: "IN",
      event: "PULL_AVAIL",
      status: "ERROR",
      latencyMs: Date.now() - started,
      requestSummary: "PUSH /availability",
      responseSummary: "",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to ingest availability" }, { status: 500 });
  }
}
