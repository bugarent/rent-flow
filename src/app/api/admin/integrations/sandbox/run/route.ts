import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/sessions";
import { generateIntegrationApiKey } from "@/lib/integrations/auth";
import { createIntegration, listIntegrations, patchIntegration } from "@/lib/integrations/repository";
import { runSandboxCycle } from "@/lib/integrations/sync-engine";
import { seedMockPartnerFleet } from "@/lib/integrations/sandbox/simulator";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";

const schema = z.object({
  integrationId: z.string().optional(),
  partnerId: z.string().optional(),
  vehicleCount: z.number().int().min(1).max(20).optional(),
});

function originFrom(req: Request) {
  return (
    req.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    seedMockPartnerFleet(body.vehicleCount ?? 3);

    let integrationId = body.integrationId;
    let apiKey: string | undefined;

    if (!integrationId) {
      const local = loadLocalPartner();
      const partnerId = body.partnerId || local?.id || LOCAL_PARTNER_ID;
      const existing = (await listIntegrations()).items.find(
        (i) => i.isSandbox && i.partnerId === partnerId,
      );
      const mockBase = `${originFrom(req)}/api/integrations/sandbox/mock`;
      if (existing) {
        integrationId = existing.id;
        await patchIntegration(existing.id, {
          webhookUrl: mockBase,
          status: "TESTING",
          manualOverride: false,
        });
      } else {
        const key = generateIntegrationApiKey("test");
        apiKey = key.fullKey;
        const { item } = await createIntegration({
          partnerId,
          partnerName: local?.companyName || "Sandbox Partner",
          name: "Mock Partner Simulator",
          apiKeyHash: key.hash,
          apiKeyPrefix: key.prefix,
          webhookUrl: mockBase,
          syncMode: "BOTH",
          status: "TESTING",
          isSandbox: true,
          pollIntervalMinutes: 15,
        });
        integrationId = item.id;
      }
    }

    const result = await runSandboxCycle(integrationId!);
    return NextResponse.json({
      integrationId,
      apiKey,
      mockWebhookBase: `${originFrom(req)}/api/integrations/sandbox/mock`,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("[admin/integrations/sandbox]", error);
    return NextResponse.json({ error: "Sandbox run failed" }, { status: 500 });
  }
}
