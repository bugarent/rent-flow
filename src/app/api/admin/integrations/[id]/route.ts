import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/sessions";
import { generateIntegrationApiKey } from "@/lib/integrations/auth";
import {
  getIntegration,
  listLogs,
  listMappings,
  patchIntegration,
  removeIntegration,
} from "@/lib/integrations/repository";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  syncMode: z.enum(["PULL", "PUSH", "BOTH"]).optional(),
  status: z.enum(["DRAFT", "TESTING", "LIVE", "DISABLED"]).optional(),
  manualOverride: z.boolean().optional(),
  pollIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  rotateKey: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const integration = await getIntegration(id);
  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [mappings, logs] = await Promise.all([listMappings(id), listLogs(id, 40)]);
  return NextResponse.json({ integration, mappings, logs });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  try {
    const body = patchSchema.parse(await req.json());
    const existing = await getIntegration(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let apiKey: string | undefined;
    const patch: Parameters<typeof patchIntegration>[1] = {
      name: body.name,
      webhookUrl: body.webhookUrl,
      syncMode: body.syncMode,
      status: body.status,
      manualOverride: body.manualOverride,
      pollIntervalMinutes: body.pollIntervalMinutes,
    };

    if (body.rotateKey) {
      const key = generateIntegrationApiKey(existing.isSandbox ? "test" : "live");
      patch.apiKeyHash = key.hash;
      patch.apiKeyPrefix = key.prefix;
      apiKey = key.fullKey;
    }

    const updated = await patchIntegration(id, patch);
    return NextResponse.json({
      integration: updated,
      apiKey,
      message: apiKey ? "API key rotated — store the new key securely." : "Updated",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const ok = await removeIntegration(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
