import { NextResponse } from "next/server";
import { extractApiKeyFromHeaders } from "@/lib/integrations/auth";
import { resolveIntegrationByApiKey } from "@/lib/integrations/repository";

export async function GET(req: Request) {
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

  return NextResponse.json({
    ok: true,
    integrationId: integration.id,
    partnerId: integration.partnerId,
    status: integration.status,
    syncMode: integration.syncMode,
  });
}
